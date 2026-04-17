import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Result } from '@shared/kernel';
import { AppError, err, ok } from '@shared/kernel';
import type { AccountDeletionRequestRepository } from '@domain/account-deletion/ports/account-deletion-request.repository';
import { ACCOUNT_DELETION_REQUEST_REPOSITORY } from '@domain/account-deletion/ports/account-deletion-request.repository';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { renderAccountDeletionCancelledEmail } from '../../notifications/templates/account-deletion-template';

@Injectable()
export class CancelAccountDeletionUseCase {
  private readonly logger = new Logger(CancelAccountDeletionUseCase.name);

  constructor(
    @Inject(ACCOUNT_DELETION_REQUEST_REPOSITORY)
    private readonly requests: AccountDeletionRequestRepository,
    @Inject(AUDIT_RECORDER_PORT) private readonly audit: AuditRecorderPort,
    @Optional() @Inject(USER_REPOSITORY) private readonly userRepo?: UserRepository,
    @Optional() @Inject(EMAIL_SENDER_PORT) private readonly emailSender?: EmailSenderPort,
  ) {}

  /**
   * Cancel the pending deletion. Identified either by the userId (when the
   * authenticated owner of the request cancels it in-app) or by the
   * cancelToken (when they follow the email link while logged out).
   */
  async execute(params: { userId?: string; cancelToken?: string }): Promise<Result<void>> {
    if (!params.userId && !params.cancelToken) {
      return err(AppError.validation('userId or cancelToken is required.'));
    }

    const request = params.userId
      ? await this.requests.findPendingByUserId(params.userId)
      : await this.requests.findByCancelToken(params.cancelToken!);

    if (!request) {
      return err(AppError.notFound('AccountDeletionRequest'));
    }

    if (request.status !== 'REQUESTED') {
      return err(AppError.conflict(`Cannot cancel deletion in status ${request.status}.`));
    }

    request.cancel();
    await this.requests.save(request);

    if (request.academyId) {
      await this.audit.record({
        actorUserId: request.userId,
        academyId: request.academyId,
        action: 'ACCOUNT_DELETION_CANCELED',
        entityType: 'USER',
        entityId: request.userId,
        context: {
          requestId: request.id.toString(),
          viaToken: params.cancelToken ? 'true' : 'false',
        },
      });
    }

    // Fire-and-forget: notify owner that deletion has been cancelled
    if (this.emailSender && this.userRepo) {
      const user = await this.userRepo.findById(request.userId);
      if (user) {
        this.emailSender.send({
          to: user.emailNormalized,
          subject: 'Account Deletion Cancelled - Academyflo',
          html: renderAccountDeletionCancelledEmail({
            ownerName: user.fullName,
            academyName: 'Academyflo',
          }),
        }).catch(() => {});
      }
    }

    this.logger.log(`Account deletion canceled for user=${request.userId}`);
    return ok(undefined);
  }
}
