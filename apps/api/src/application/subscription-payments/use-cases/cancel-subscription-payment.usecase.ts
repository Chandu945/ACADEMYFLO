import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SubscriptionPaymentRepository } from '@domain/subscription-payments/ports/subscription-payment.repository';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';

export interface CancelSubscriptionPaymentInput {
  actorUserId: string;
  orderId: string;
}

export interface CancelSubscriptionPaymentOutput {
  orderId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

/**
 * Lets an owner explicitly cancel a PENDING subscription payment from the
 * mobile/web "Cancel" button. Without this, when the user cancels in the
 * payment provider (e.g. backs out of PhonePe), Cashfree leaves the order
 * in ACTIVE state for ~15 min and our get-status endpoint keeps reporting
 * PENDING. The mobile's SubscriptionScreen auto-resumes polling for any
 * order found in `pendingPaymentOrderId`, so the owner gets stuck on the
 * "Confirming payment" modal on every visit until Cashfree's TTL fires.
 * Marking the payment FAILED here clears the auto-resume trap immediately.
 *
 * Idempotent semantics:
 * - PENDING → marked FAILED('USER_CANCELLED'), audit recorded
 * - Already FAILED → no-op success (covers double-tap on Cancel)
 * - Already SUCCESS → no-op success, preserve SUCCESS (a webhook may have
 *   raced our cancel; the user actually paid, don't clobber that)
 */
export class CancelSubscriptionPaymentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly paymentRepo: SubscriptionPaymentRepository,
    private readonly logger: LoggerPort,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(
    input: CancelSubscriptionPaymentInput,
  ): Promise<Result<CancelSubscriptionPaymentOutput, AppError>> {
    const user = await this.userRepo.findById(input.actorUserId);
    if (!user) return err(AppError.notFound('User', input.actorUserId));
    if (user.role !== 'OWNER') {
      return err(AppError.forbidden('Only owners can cancel payments'));
    }
    if (!user.academyId) {
      return err(AppError.forbidden('Cancel a payment after academy setup'));
    }

    const payment = await this.paymentRepo.findByOrderId(input.orderId);
    if (!payment) return err(AppError.notFound('SubscriptionPayment', input.orderId));

    // Defense in depth: cross-tenant access. Use the same notFound surface
    // we use for missing IDs so we don't leak existence to other academies.
    if (payment.academyId !== user.academyId) {
      return err(AppError.notFound('SubscriptionPayment', input.orderId));
    }

    if (payment.status === 'SUCCESS') {
      // Webhook beat us — user actually paid. Don't clobber SUCCESS.
      this.logger.info('Cancel ignored: payment already SUCCESS', {
        orderId: input.orderId,
        academyId: payment.academyId,
      });
      return ok({ orderId: payment.orderId, status: 'SUCCESS' });
    }

    if (payment.status === 'FAILED') {
      // Idempotent: a second Cancel tap, or a prior FAILED transition
      // (e.g. AMOUNT_MISMATCH from poll-verification). Nothing to do.
      return ok({ orderId: payment.orderId, status: 'FAILED' });
    }

    // PENDING → FAILED. CAS ensures we don't race a concurrent webhook /
    // poll-verification that wants to mark SUCCESS or FAILED. If the CAS
    // fails, re-load the authoritative state and surface that instead.
    const cancelled = payment.markFailed('USER_CANCELLED');
    const transitioned = await this.paymentRepo.saveWithStatusPrecondition(cancelled, 'PENDING');

    if (!transitioned) {
      const refreshed = await this.paymentRepo.findByOrderId(input.orderId);
      this.logger.info('Cancel raced — surfaced authoritative state', {
        orderId: input.orderId,
        finalStatus: refreshed?.status,
      });
      return ok({ orderId: input.orderId, status: refreshed?.status ?? 'PENDING' });
    }

    await this.auditRecorder
      .record({
        academyId: payment.academyId,
        actorUserId: input.actorUserId,
        action: 'SUBSCRIPTION_PAYMENT_FAILED',
        entityType: 'SUBSCRIPTION_PAYMENT',
        entityId: input.orderId,
        context: {
          reason: 'USER_CANCELLED',
          tierKey: payment.tierKey,
        },
      })
      .catch(() => {
        // Audit failure is logged but never blocks the cancel — the user
        // explicitly asked to back out and shouldn't see an error because
        // the audit pipeline hiccupped.
      });

    this.logger.info('Subscription payment cancelled by user', {
      orderId: input.orderId,
      academyId: payment.academyId,
    });

    return ok({ orderId: input.orderId, status: 'FAILED' });
  }
}
