import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import { canCancelPaymentRequest } from '@domain/fee/rules/payment-request.rules';
import { PaymentRequestErrors } from '../../common/errors';
import type { PaymentRequestDto } from '../dtos/payment-request.dto';
import { toPaymentRequestDto } from '../dtos/payment-request.dto';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import { buildManualPaymentWithdrawnPush } from '../../notifications/templates/manual-payment-withdrawn-template';
import { ConcurrentModificationError } from '@shared/errors/concurrent-modification.error';

export interface CancelPaymentRequestInput {
  actorUserId: string;
  actorRole: UserRole;
  requestId: string;
}

export class CancelPaymentRequestUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly auditRecorder: AuditRecorderPort,
    /**
     * Used to notify academy owners when a parent cancels their own pending
     * payment request (L7 fix). Optional so legacy fixtures keep working —
     * without it the cancel still succeeds and the audit is still recorded;
     * only the owner-side push is skipped. Staff cancels never push.
     */
    private readonly pushService?: PushNotificationService,
  ) {}

  async execute(input: CancelPaymentRequestInput): Promise<Result<PaymentRequestDto, AppError>> {
    const check = canCancelPaymentRequest(input.actorRole);
    if (!check.allowed) return err(PaymentRequestErrors.cancelNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(PaymentRequestErrors.academyRequired());

    const request = await this.paymentRequestRepo.findById(input.requestId);
    if (!request) return err(PaymentRequestErrors.requestNotFound(input.requestId));
    if (request.academyId !== user.academyId)
      return err(PaymentRequestErrors.requestNotInAcademy());
    if (request.staffUserId !== input.actorUserId) return err(PaymentRequestErrors.notOwnRequest());
    // M5 defense-in-depth: a PARENT actor can only cancel PARENT-source PRs.
    // The ownership check above already enforces "only your own" because
    // staffUserId is the parent's userId for PARENT-source PRs — but pinning
    // source explicitly stops a future bug where the user-id field somehow
    // collided with a STAFF-source request.
    if (input.actorRole === 'PARENT' && request.source !== 'PARENT') {
      return err(PaymentRequestErrors.notOwnRequest());
    }
    if (request.status !== 'PENDING') return err(PaymentRequestErrors.notPending());

    const cancelled = request.cancel();
    try {
      await this.paymentRequestRepo.save(cancelled);
    } catch (e) {
      // Mirror of the M2/M3 polish: an optimistic-concurrency clash here means
      // a concurrent path transitioned the PR out of PENDING between our
      // status check and our save — typically mark-fee-paid's M4 auto-resolve
      // or an owner reject landing first. The PR ends up in a terminal state
      // (CANCELLED / REJECTED) either way; surface a domain-shaped notPending
      // error instead of letting the bare ConcurrentModification 409 reach
      // the parent.
      if (e instanceof ConcurrentModificationError) {
        return err(PaymentRequestErrors.notPending());
      }
      throw e;
    }

    await this.auditRecorder.record({
      academyId: user.academyId,
      actorUserId: input.actorUserId,
      action: 'PAYMENT_REQUEST_CANCELLED',
      entityType: 'PAYMENT_REQUEST',
      entityId: input.requestId,
      // L7: include source so the audit log can distinguish a parent
      // withdrawing their submission from staff retracting their cash claim.
      context: { paymentRequestId: input.requestId, source: cancelled.source },
    });

    const student = await this.studentRepo.findById(cancelled.studentId);

    // L7: when a parent cancels, notify the academy's owners so the queue
    // doesn't silently shrink without explanation. Staff cancels are not
    // notified — staff are typically nearby and communicate verbally.
    // Best-effort: push failures never fail the cancel.
    if (this.pushService && cancelled.source === 'PARENT') {
      try {
        const { users: owners } = await this.userRepo.listByAcademyAndRole(
          user.academyId,
          'OWNER',
          1,
          100,
        );
        const ownerIds = owners.map((o) => o.id.toString());
        if (ownerIds.length > 0 && student) {
          const message = buildManualPaymentWithdrawnPush({
            studentName: student.fullName,
            monthKey: cancelled.monthKey,
            academyId: cancelled.academyId,
            paymentRequestId: cancelled.id.toString(),
            studentId: cancelled.studentId,
          });
          await this.pushService.sendToUsers(ownerIds, message);
        }
      } catch {
        // Swallow — cancel is already recorded and audit-logged. Missing a
        // notification is recoverable (owner sees the cancelled tab on next
        // refresh).
      }
    }

    return ok(
      toPaymentRequestDto(cancelled, {
        staffName: user.fullName,
        studentName: student?.fullName,
      }),
    );
  }
}
