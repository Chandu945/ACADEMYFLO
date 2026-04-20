import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { AppError, err, ok } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import { SESSION_REPOSITORY } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import { PASSWORD_HASHER } from '@application/identity/ports/password-hasher.port';
import type { AccountDeletionRequestRepository } from '@domain/account-deletion/ports/account-deletion-request.repository';
import { ACCOUNT_DELETION_REQUEST_REPOSITORY } from '@domain/account-deletion/ports/account-deletion-request.repository';
import { AccountDeletionRequest } from '@domain/account-deletion/entities/account-deletion-request.entity';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { renderAccountDeletionRequestedEmail } from '../../notifications/templates/account-deletion-template';
import { formatIstDate } from '@shared/utils/date-format';
import type { RequestAccountDeletionInput, AccountDeletionStatusDto } from '../dto/account-deletion.dto';

export const DEFAULT_COOLING_OFF_DAYS = 30;
const REQUIRED_PHRASE = 'DELETE';

@Injectable()
export class RequestAccountDeletionUseCase {
  private readonly logger = new Logger(RequestAccountDeletionUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ACCOUNT_DELETION_REQUEST_REPOSITORY)
    private readonly requests: AccountDeletionRequestRepository,
    @Inject(AUDIT_RECORDER_PORT) private readonly audit: AuditRecorderPort,
    @Optional() @Inject(EMAIL_SENDER_PORT) private readonly emailSender?: EmailSenderPort,
  ) {}

  async execute(input: RequestAccountDeletionInput): Promise<Result<AccountDeletionStatusDto>> {
    if (input.confirmationPhrase !== REQUIRED_PHRASE) {
      return err(AppError.validation(`You must type "${REQUIRED_PHRASE}" to confirm.`));
    }

    const user = await this.users.findById(input.userId);
    if (!user || !user.isActive()) {
      return err(AppError.notFound('User', input.userId));
    }

    if (user.role !== 'OWNER') {
      return err(
        AppError.forbidden(
          'Only academy owners can delete their account. Staff and parents cannot self-delete.',
        ),
      );
    }
    if (!user.academyId) {
      return err(AppError.validation('Owner is not linked to an academy.'));
    }

    const passwordOk = await this.hasher.compare(input.password, user.passwordHash);
    if (!passwordOk) {
      return err(AppError.unauthorized('Password is incorrect.'));
    }

    const existing = await this.requests.findPendingByUserId(input.userId);
    if (existing) {
      return err(AppError.conflict('A deletion request is already pending for this account.'));
    }

    const request = AccountDeletionRequest.create({
      id: randomUUID(),
      userId: input.userId,
      role: user.role,
      academyId: user.academyId,
      reason: input.reason ?? null,
      coolingOffDays: DEFAULT_COOLING_OFF_DAYS,
      cancelToken: randomBytes(32).toString('hex'),
      requestedFromIp: input.requestedFromIp ?? null,
    });

    await this.requests.save(request);

    // Revoke all sessions for this user. The caller proved fresh possession of
    // the password, so they'll need to log in again to cancel or check status.
    // This also kills any attacker-hijacked session before the 30-day execution.
    await this.sessions.revokeAllByUserIds([input.userId]);

    if (user.academyId) {
      await this.audit.record({
        actorUserId: input.userId,
        academyId: user.academyId,
        action: 'ACCOUNT_DELETION_REQUESTED',
        entityType: 'USER',
        entityId: input.userId,
        context: {
          scheduledExecutionAt: request.scheduledExecutionAt.toISOString(),
          role: user.role,
          reason: request.reason ?? '',
        },
      });
    }

    this.logger.log(
      `Account deletion requested for user=${input.userId} role=${user.role} scheduled=${request.scheduledExecutionAt.toISOString()}`,
    );

    // Fire-and-forget: notify owner about scheduled deletion
    if (this.emailSender) {
      this.emailSender.send({
        to: user.emailNormalized,
        subject: 'Account Deletion Scheduled - Academyflo',
        html: renderAccountDeletionRequestedEmail({
          ownerName: user.fullName,
          academyName: 'Academyflo',
          scheduledDate: formatIstDate(request.scheduledExecutionAt),
        }),
      }).catch(() => {});
    }

    return ok(this.toDto(request));
  }

  private toDto(r: AccountDeletionRequest): AccountDeletionStatusDto {
    return {
      id: r.id.toString(),
      status: r.status,
      requestedAt: r.requestedAt.toISOString(),
      scheduledExecutionAt: r.scheduledExecutionAt.toISOString(),
      canceledAt: r.canceledAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      reason: r.reason,
      role: r.role,
    };
  }
}
