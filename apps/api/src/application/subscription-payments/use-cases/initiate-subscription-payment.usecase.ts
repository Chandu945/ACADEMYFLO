import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { SubscriptionPaymentRepository } from '@domain/subscription-payments/ports/subscription-payment.repository';
import type { CashfreeGatewayPort } from '@domain/subscription-payments/ports/cashfree-gateway.port';
import type { ActiveStudentCounterPort } from '@application/subscription/ports/active-student-counter.port';
import type { ClockPort } from '@application/common/clock.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { SubscriptionPayment } from '@domain/subscription-payments/entities/subscription-payment.entity';
import { requiredTierForCount } from '@domain/subscription/rules/subscription-tier.rules';
import {
  priceForTier,
  generateOrderId,
} from '@domain/subscription-payments/rules/subscription-payment.rules';
import type { InitiatePaymentOutput } from '../dtos/subscription-payment.dto';
import { randomUUID } from 'node:crypto';

export class InitiateSubscriptionPaymentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly paymentRepo: SubscriptionPaymentRepository,
    private readonly cashfreeGateway: CashfreeGatewayPort,
    private readonly studentCounter: ActiveStudentCounterPort,
    private readonly clock: ClockPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(actorUserId: string): Promise<Result<InitiatePaymentOutput, AppError>> {
    // Validate actor is OWNER
    const user = await this.userRepo.findById(actorUserId);
    if (!user) return err(AppError.notFound('User', actorUserId));
    if (user.role !== 'OWNER') return err(AppError.forbidden('Only owners can initiate payments'));

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
      return err(new AppError('ACADEMY_SETUP_REQUIRED', 'Please complete academy setup first'));
    }

    // Block if academy login is disabled
    if (academy.loginDisabled) {
      return err(AppError.forbidden('Cannot initiate payment for a disabled academy'));
    }

    // Check for existing PENDING payment
    const existingPending = await this.paymentRepo.findPendingByAcademyId(academyId);
    if (existingPending) {
      return err(AppError.conflict('A payment is already in progress for this academy'));
    }

    // Load subscription
    const subscription = await this.subscriptionRepo.findByAcademyId(academyId);
    if (!subscription) {
      return err(AppError.notFound('Subscription'));
    }

    // Compute tier + amount
    const now = this.clock.now();
    const activeStudentCount = await this.studentCounter.countActiveStudents(academyId, now);
    const requiredTier = requiredTierForCount(activeStudentCount);
    const amountInr = priceForTier(requiredTier);

    // Create order with Cashfree
    const orderId = generateOrderId();
    const idempotencyKey = randomUUID();

    let cfResult;
    try {
      cfResult = await this.cashfreeGateway.createOrder({
        orderId,
        orderAmount: amountInr,
        orderCurrency: 'INR',
        customerId: actorUserId,
        customerPhone: user.phoneE164,
        idempotencyKey,
      });
    } catch (error) {
      this.logger.error('Cashfree createOrder failed', {
        academyId,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return err(new AppError('PAYMENT_PROVIDER_UNAVAILABLE', 'Payment provider is temporarily unavailable. Please try again.'));
    }

    // Persist payment record
    const payment = SubscriptionPayment.create({
      id: randomUUID(),
      academyId,
      ownerUserId: actorUserId,
      orderId,
      paymentSessionId: cfResult.paymentSessionId,
      tierKey: requiredTier,
      amountInr,
      activeStudentCountAtPurchase: activeStudentCount,
    });

    const withCfId = payment.setCfOrderId(cfResult.cfOrderId);
    await this.paymentRepo.save(withCfId);

    this.logger.info('Subscription payment initiated', {
      academyId,
      orderId,
      tierKey: requiredTier,
      amountInr,
    });

    return ok({
      orderId,
      paymentSessionId: cfResult.paymentSessionId,
      amountInr,
      currency: 'INR',
      tierKey: requiredTier,
      expiresAt: cfResult.orderExpiryTime,
    });
  }
}
