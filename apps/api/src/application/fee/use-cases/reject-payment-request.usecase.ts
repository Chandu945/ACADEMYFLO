import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { ClockPort } from '../../common/clock.port';
import {
  canReviewPaymentRequest,
  validateRejectionReason,
} from '@domain/fee/rules/payment-request.rules';
import { PaymentRequestErrors } from '../../common/errors';
import type { PaymentRequestDto } from '../dtos/payment-request.dto';
import { toPaymentRequestDto } from '../dtos/payment-request.dto';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import { buildManualPaymentRejectedPush } from '../../notifications/templates/manual-payment-result-templates';

export interface RejectPaymentRequestInput {
  actorUserId: string;
  actorRole: UserRole;
  requestId: string;
  reason: string;
}

export class RejectPaymentRequestUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly clock: ClockPort,
    private readonly auditRecorder: AuditRecorderPort,
    /**
     * Optional so legacy fixtures keep working. Production wiring always
     * passes the push service. Push failures never roll back the rejection.
     */
    private readonly pushService?: PushNotificationService,
  ) {}

  async execute(input: RejectPaymentRequestInput): Promise<Result<PaymentRequestDto, AppError>> {
    const check = canReviewPaymentRequest(input.actorRole);
    if (!check.allowed) return err(PaymentRequestErrors.reviewNotAllowed());

    if (!input.reason || !input.reason.trim()) {
      return err(PaymentRequestErrors.rejectionReasonRequired());
    }

    const reasonCheck = validateRejectionReason(input.reason);
    if (!reasonCheck.valid) {
      return err(PaymentRequestErrors.rejectionReasonRequired());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(PaymentRequestErrors.academyRequired());

    const request = await this.paymentRequestRepo.findById(input.requestId);
    if (!request) return err(PaymentRequestErrors.requestNotFound(input.requestId));
    if (request.academyId !== user.academyId)
      return err(PaymentRequestErrors.requestNotInAcademy());
    if (request.status !== 'PENDING') return err(PaymentRequestErrors.notPending());

    const now = this.clock.now();
    const rejected = request.reject(input.actorUserId, now, input.reason.trim());

    // H1 fix: previously this path also called `feeDue.revertToDue()` and
    // re-saved the fee. That was a leftover from an old workflow where the
    // FeeDue moved into an "AWAITING" state on PR creation. The current
    // entity has no such state — a pending PR doesn't change the FeeDue at
    // all — so the revert was a no-op for status. But `revertToDue` was
    // also nulling `lateFeeConfigSnapshot`, which meant rejecting a request
    // silently stripped the M1 rate-lock from the fee. The cron's
    // legacy-backfill scan would then re-snapshot at the current live rate,
    // retroactively re-pricing parents who got a rejection between rate
    // changes. Now the rejection touches only the PaymentRequest.
    await this.paymentRequestRepo.save(rejected);

    await this.auditRecorder.record({
      academyId: user.academyId,
      actorUserId: input.actorUserId,
      action: 'PAYMENT_REQUEST_REJECTED',
      entityType: 'PAYMENT_REQUEST',
      entityId: input.requestId,
      context: { paymentRequestId: input.requestId },
    });

    // Resolve names for response
    const [staffUser, student] = await Promise.all([
      this.userRepo.findById(rejected.staffUserId),
      this.studentRepo.findById(rejected.studentId),
    ]);

    // Notify the parent only when this rejection is for a parent-submitted
    // manual payment. Staff-submitted requests don't need a push to the
    // staff who created them — staff see the result in the in-app queue.
    if (this.pushService && rejected.source === 'PARENT' && student) {
      try {
        const message = buildManualPaymentRejectedPush({
          studentName: student.fullName,
          monthKey: rejected.monthKey,
          academyId: rejected.academyId,
          paymentRequestId: rejected.id.toString(),
          studentId: rejected.studentId,
        });
        // staffUserId stores the parent's userId for PARENT-source requests.
        await this.pushService.sendToUsers([rejected.staffUserId], message);
      } catch {
        // Swallow — rejection is already recorded.
      }
    }

    return ok(
      toPaymentRequestDto(rejected, {
        staffName: staffUser?.fullName,
        studentName: student?.fullName,
        reviewedByName: user.fullName,
      }),
    );
  }
}
