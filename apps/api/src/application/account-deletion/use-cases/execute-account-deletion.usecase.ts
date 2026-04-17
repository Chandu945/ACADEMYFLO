import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Result } from '@shared/kernel';
import { AppError, err, ok } from '@shared/kernel';
import type { AccountDeletionRequestRepository } from '@domain/account-deletion/ports/account-deletion-request.repository';
import { ACCOUNT_DELETION_REQUEST_REPOSITORY } from '@domain/account-deletion/ports/account-deletion-request.repository';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { renderAccountDeletionExecutedEmail } from '../../notifications/templates/account-deletion-template';
import { DefaultDeletionStrategyRegistry } from '../services/deletion-strategy';

@Injectable()
export class ExecuteAccountDeletionUseCase {
  private readonly logger = new Logger(ExecuteAccountDeletionUseCase.name);

  constructor(
    @Inject(ACCOUNT_DELETION_REQUEST_REPOSITORY)
    private readonly requests: AccountDeletionRequestRepository,
    private readonly strategies: DefaultDeletionStrategyRegistry,
    @Inject(AUDIT_RECORDER_PORT) private readonly audit: AuditRecorderPort,
    @Optional() @Inject(USER_REPOSITORY) private readonly users?: UserRepository,
    @Optional() @Inject(EMAIL_SENDER_PORT) private readonly emailSender?: EmailSenderPort,
  ) {}

  async executeById(requestId: string): Promise<Result<void>> {
    const request = await this.requests.findById(requestId);
    if (!request) {
      return err(AppError.notFound('AccountDeletionRequest', requestId));
    }
    return this.executeOne(request);
  }

  async sweep(now: Date = new Date(), limit = 50): Promise<{ processed: number; failed: number }> {
    const due = await this.requests.listDue(now, limit);
    let processed = 0;
    let failed = 0;
    for (const req of due) {
      const res = await this.executeOne(req);
      if (res.ok) processed += 1;
      else failed += 1;
    }
    return { processed, failed };
  }

  private async executeOne(request: ReturnType<AccountDeletionRequestRepository['findById']> extends Promise<infer X> ? NonNullable<X> : never): Promise<Result<void>> {
    if (request.status !== 'REQUESTED') {
      return err(AppError.conflict(`Request is ${request.status}; expected REQUESTED.`));
    }
    if (!request.isDue()) {
      return err(AppError.validation('Request is not yet due for execution.'));
    }

    // Capture user info before deletion for notification
    const userBeforeDeletion = this.users ? await this.users.findById(request.userId) : null;

    const strategy = this.strategies.for(request.role);
    const outcome = await strategy.execute(request);
    if (!outcome.ok) {
      this.logger.error(
        `Strategy for role=${request.role} refused to execute deletion id=${request.id.toString()}: ${outcome.error.message}`,
      );
      return outcome;
    }

    request.markCompleted();
    await this.requests.save(request);

    if (request.academyId) {
      await this.audit.record({
        actorUserId: request.userId,
        academyId: request.academyId,
        action: 'ACCOUNT_DELETION_COMPLETED',
        entityType: 'USER',
        entityId: request.userId,
        context: {
          requestId: request.id.toString(),
          role: request.role,
        },
      });
    }

    // Fire-and-forget: notify owner that account has been permanently deleted
    if (this.emailSender && userBeforeDeletion) {
      this.emailSender.send({
        to: userBeforeDeletion.emailNormalized,
        subject: 'Account Permanently Deleted - Academyflo',
        html: renderAccountDeletionExecutedEmail({
          ownerName: userBeforeDeletion.fullName,
          ownerEmail: userBeforeDeletion.emailNormalized,
        }),
      }).catch(() => {});
    }

    this.logger.log(
      `Account deletion executed for user=${request.userId} role=${request.role}`,
    );
    return ok(undefined);
  }
}
