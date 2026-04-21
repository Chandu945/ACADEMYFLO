import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { SubscriptionPaymentRepository } from '@domain/subscription-payments/ports/subscription-payment.repository';
import type { CashfreeGatewayPort } from '@domain/subscription-payments/ports/cashfree-gateway.port';
import type { ActiveStudentCounterPort } from '@application/subscription/ports/active-student-counter.port';
import type { ClockPort } from '@application/common/clock.port';
import type { TransactionPort } from '@application/common/transaction.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { evaluateSubscriptionStatus } from '@domain/subscription/rules/subscription.rules';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import { computePaidDates } from '@domain/subscription-payments/rules/subscription-payment.rules';
import { requiredTierForCount } from '@domain/subscription/rules/subscription-tier.rules';
import type { PaymentStatusOutput } from '../dtos/subscription-payment.dto';
import type { TierKey } from '@academyflo/contracts';

export class GetSubscriptionPaymentStatusUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly paymentRepo: SubscriptionPaymentRepository,
    private readonly clock: ClockPort,
    private readonly cashfreeGateway: CashfreeGatewayPort,
    private readonly transaction: TransactionPort,
    private readonly logger: LoggerPort,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly studentCounter: ActiveStudentCounterPort,
  ) {}

  async execute(
    actorUserId: string,
    orderId: string,
  ): Promise<Result<PaymentStatusOutput, AppError>> {
    // Validate actor is OWNER
    const user = await this.userRepo.findById(actorUserId);
    if (!user) return err(AppError.notFound('User', actorUserId));
    if (user.role !== 'OWNER') return err(AppError.forbidden('Only owners can check payment status'));

    // Resolve academy
    let academyId = user.academyId;
    let academy;

    if (academyId) {
      academy = await this.academyRepo.findById(academyId);
    }
    if (!academy) {
      academy = await this.academyRepo.findByOwnerUserId(actorUserId);
      if (academy) academyId = academy.id.toString();
    }

    if (!academy || !academyId) {
      return err(AppError.notFound('Academy'));
    }

    // Load payment
    let payment = await this.paymentRepo.findByOrderId(orderId);
    if (!payment) {
      return err(AppError.notFound('SubscriptionPayment', orderId));
    }

    // Verify academy scoping
    if (payment.academyId !== academyId) {
      return err(AppError.forbidden('Payment does not belong to your academy'));
    }

    // Server-side verification: if PENDING, check with Cashfree directly
    if (payment.status === 'PENDING') {
      const pendingPayment = payment; // capture for closure
      try {
        const cfOrder = await this.cashfreeGateway.getOrder(pendingPayment.orderId);

        if (cfOrder.orderStatus === 'PAID') {
          // Defense-in-depth: same amount check the webhook does. Prevents
          // activating if the provider's order amount diverges from what we stored.
          // On mismatch we MUST mark the payment FAILED (not leave it PENDING) so
          // the owner can see the failure and start a new payment instead of being
          // stuck in limbo. Use CAS to avoid racing a concurrent webhook that has
          // already marked the payment SUCCESS.
          if (cfOrder.orderAmount !== pendingPayment.amountInr) {
            this.logger.error('Poll-verification amount mismatch', {
              orderId,
              cashfreeAmount: cfOrder.orderAmount,
              storedAmount: pendingPayment.amountInr,
            });
            const failed = pendingPayment.markFailed('AMOUNT_MISMATCH');
            const transitioned = await this.paymentRepo.saveWithStatusPrecondition(failed, 'PENDING');
            if (transitioned) {
              await this.auditRecorder.record({
                academyId: pendingPayment.academyId,
                actorUserId: pendingPayment.ownerUserId,
                action: 'SUBSCRIPTION_PAYMENT_FAILED',
                entityType: 'SUBSCRIPTION_PAYMENT',
                entityId: orderId,
                context: {
                  reason: 'AMOUNT_MISMATCH',
                  tierKey: pendingPayment.tierKey,
                  storedAmountInr: String(pendingPayment.amountInr),
                  providerAmountInr: String(cfOrder.orderAmount),
                  verifiedBy: 'server_poll',
                },
              });
            }
            // Re-load: either the failed state we just wrote, or whatever the
            // concurrent webhook wrote (SUCCESS is possible if it ran first).
            payment = (await this.paymentRepo.findByOrderId(orderId)) ?? failed;
            // fall through to return the authoritative status below
          } else {

          // Cashfree confirms payment — mark as SUCCESS and activate subscription
          const now = this.clock.now();
          const providerPaymentId = `verified_${cfOrder.cfOrderId}`;
          const updated = pendingPayment.markSuccess(providerPaymentId, now);

          const saveAndActivate = async () => {
            const transitioned = await this.paymentRepo.saveWithStatusPrecondition(updated, 'PENDING');
            if (!transitioned) {
              this.logger.info('Payment already transitioned — skipping server-side activation', { orderId });
              return;
            }
            await this.activateSubscription(pendingPayment.academyId, pendingPayment.tierKey, now);
          };

          await this.transaction.run(saveAndActivate);

          this.logger.info('Server-side verification: payment SUCCESS', {
            orderId,
            academyId: pendingPayment.academyId,
            tierKey: pendingPayment.tierKey,
          });

          await this.auditRecorder.record({
            academyId: pendingPayment.academyId,
            actorUserId: pendingPayment.ownerUserId,
            action: 'SUBSCRIPTION_PAYMENT_COMPLETED',
            entityType: 'SUBSCRIPTION_PAYMENT',
            entityId: orderId,
            context: {
              tierKey: pendingPayment.tierKey,
              amountInr: String(pendingPayment.amountInr),
              providerPaymentId,
              verifiedBy: 'server_poll',
            },
          });

          // Re-load payment to get updated status
          payment = (await this.paymentRepo.findByOrderId(orderId)) ?? pendingPayment;
          } // end amount-match else
        } else if (cfOrder.orderStatus === 'EXPIRED') {
          // Order expired at Cashfree — mark as FAILED
          const expired = pendingPayment.markFailed('ORDER_EXPIRED');
          await this.paymentRepo.save(expired);
          payment = expired;
          this.logger.info('Server-side verification: order expired', { orderId });
        }
        // Otherwise (ACTIVE) — still pending, continue polling
      } catch (error) {
        // Cashfree unreachable — just return current PENDING status
        this.logger.warn('Server-side verification failed, returning cached status', {
          orderId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    // Load subscription for status snapshot
    const subscription = await this.subscriptionRepo.findByAcademyId(academyId);
    const now = this.clock.now();

    let subscriptionSnapshot;
    if (subscription) {
      const evaluation = evaluateSubscriptionStatus(now, academy.loginDisabled, subscription);
      subscriptionSnapshot = {
        status: evaluation.status,
        paidStartAt: subscription.paidStartAt?.toISOString() ?? null,
        paidEndAt: subscription.paidEndAt?.toISOString() ?? null,
      };
    } else {
      subscriptionSnapshot = {
        status: 'BLOCKED' as const,
        paidStartAt: null,
        paidEndAt: null,
      };
    }

    return ok({
      orderId: payment.orderId,
      status: payment.status,
      tierKey: payment.tierKey,
      amountInr: payment.amountInr,
      providerPaymentId: payment.providerPaymentId,
      paidAt: payment.paidAt?.toISOString() ?? null,
      subscription: subscriptionSnapshot,
    });
  }

  private async activateSubscription(
    academyId: string,
    tierKey: string,
    now: Date,
  ): Promise<void> {
    const subscription = await this.subscriptionRepo.findByAcademyId(academyId);
    if (!subscription) {
      this.logger.error('No subscription found for academy during activation', { academyId });
      return;
    }

    let effectiveNow = now;
    if (subscription.paidEndAt && subscription.paidEndAt.getTime() > now.getTime()) {
      effectiveNow = new Date(subscription.paidEndAt.getTime() + 24 * 60 * 60 * 1000);
    }

    const { paidStartAt, paidEndAt } = computePaidDates(effectiveNow, subscription.trialEndAt);

    // Re-check tier at activation (mirrors handle-cashfree-webhook). If student
    // count crossed a boundary since initiate, queue a pendingTierKey upgrade.
    const currentStudentCount = await this.studentCounter.countActiveStudents(academyId, now);
    const currentRequiredTier = requiredTierForCount(currentStudentCount);
    const pendingTierKey = currentRequiredTier !== tierKey ? currentRequiredTier : null;
    if (pendingTierKey) {
      this.logger.warn('Tier changed between initiate and poll-settlement', {
        academyId,
        paidTier: tierKey,
        currentRequiredTier,
        activeStudents: currentStudentCount,
      });
    }

    // Reset peak tracker on new paid cycle — seed with current eligible count.
    const PEAK_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
    const eligibleCount = await this.studentCounter.countEligibleStudents(
      academyId,
      now,
      PEAK_GRACE_PERIOD_MS,
    );

    const activated = Subscription.reconstitute(subscription.id.toString(), {
      academyId: subscription.academyId,
      trialStartAt: subscription.trialStartAt,
      trialEndAt: subscription.trialEndAt,
      paidStartAt,
      paidEndAt,
      tierKey: tierKey as TierKey,
      pendingTierKey,
      pendingTierEffectiveAt: pendingTierKey ? paidEndAt : null,
      activeStudentCountSnapshot: currentStudentCount,
      peakStudentCountThisCycle: eligibleCount,
      manualNotes: subscription.manualNotes,
      paymentReference: subscription.paymentReference,
      audit: {
        createdAt: subscription.audit.createdAt,
        updatedAt: now,
        version: subscription.audit.version + 1,
      },
    });

    await this.subscriptionRepo.save(activated);
  }
}
