import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { SubscriptionPaymentRepository } from '@domain/subscription-payments/ports/subscription-payment.repository';
import type { ClockPort } from '@application/common/clock.port';
import { evaluateSubscriptionStatus } from '@domain/subscription/rules/subscription.rules';
import type { PaymentStatusOutput } from '../dtos/subscription-payment.dto';

export class GetSubscriptionPaymentStatusUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly paymentRepo: SubscriptionPaymentRepository,
    private readonly clock: ClockPort,
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
    const payment = await this.paymentRepo.findByOrderId(orderId);
    if (!payment) {
      return err(AppError.notFound('SubscriptionPayment', orderId));
    }

    // Verify academy scoping
    if (payment.academyId !== academyId) {
      return err(AppError.forbidden('Payment does not belong to your academy'));
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
}
