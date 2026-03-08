import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { FeePaymentRepository } from '@domain/parent/ports/fee-payment.repository';
import type { CashfreeGatewayPort } from '@domain/subscription-payments/ports/cashfree-gateway.port';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { LoggerPort } from '@shared/logging/logger.port';
import { canPayFeeOnline } from '@domain/parent/rules/parent.rules';
import { generateFeeOrderId } from '@domain/parent/rules/parent.rules';
import { FeePayment } from '@domain/parent/entities/fee-payment.entity';
import { ParentErrors } from '../../common/errors';
import type { InitiateFeePaymentOutput } from '../dtos/parent.dto';
import type { UserRole } from '@playconnect/contracts';
import { randomUUID } from 'node:crypto';

export interface InitiateFeePaymentInput {
  parentUserId: string;
  parentRole: UserRole;
  feeDueId: string;
}

export class InitiateFeePaymentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly feePaymentRepo: FeePaymentRepository,
    private readonly cashfreeGateway: CashfreeGatewayPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    input: InitiateFeePaymentInput,
  ): Promise<Result<InitiateFeePaymentOutput, AppError>> {
    const check = canPayFeeOnline(input.parentRole);
    if (!check.allowed) return err(ParentErrors.payNotAllowed());

    const user = await this.userRepo.findById(input.parentUserId);
    if (!user) return err(ParentErrors.parentNotFound(input.parentUserId));

    // Load fee due
    const feeDue = await this.feeDueRepo.findByAcademyStudentMonth(
      '', // We don't know the academy yet, use findById approach
      '',
      '',
    ).catch(() => null);

    // We need to find the fee due by ID — let's search by iterating links
    // Actually, we need a direct lookup. Let's load all links first.
    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return err(ParentErrors.childNotLinked());

    // Find fee due across linked academies
    let foundDue = null;
    let matchedLink = null;
    for (const link of links) {
      // We need to search fees for this student
      // But we don't have a findById on FeeDueRepository...
      // Let's search by loading all dues for each student
      const dues = await this.feeDueRepo.listByStudentAndRange(
        link.academyId,
        link.studentId,
        '2000-01',
        '2099-12',
      );
      const match = dues.find((d) => d.id.toString() === input.feeDueId);
      if (match) {
        foundDue = match;
        matchedLink = link;
        break;
      }
    }

    if (!foundDue || !matchedLink) return err(ParentErrors.feeDueNotFound(input.feeDueId));
    if (foundDue.status === 'PAID') return err(ParentErrors.feeDueAlreadyPaid());

    // Check for existing pending payment
    const existingPending = await this.feePaymentRepo.findPendingByFeeDueId(input.feeDueId);
    if (existingPending) return err(ParentErrors.paymentAlreadyPending());

    // Create order with Cashfree
    const orderId = generateFeeOrderId();
    const idempotencyKey = randomUUID();

    let cfResult;
    try {
      cfResult = await this.cashfreeGateway.createOrder({
        orderId,
        orderAmount: foundDue.amount,
        orderCurrency: 'INR',
        customerId: input.parentUserId,
        customerPhone: user.phoneE164,
        idempotencyKey,
      });
    } catch (error) {
      this.logger.error('Cashfree createOrder failed for fee payment', {
        feeDueId: input.feeDueId,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return err(ParentErrors.paymentProviderUnavailable());
    }

    // Persist payment record
    const payment = FeePayment.create({
      id: randomUUID(),
      academyId: matchedLink.academyId,
      parentUserId: input.parentUserId,
      studentId: matchedLink.studentId,
      feeDueId: input.feeDueId,
      monthKey: foundDue.monthKey,
      orderId,
      paymentSessionId: cfResult.paymentSessionId,
      amount: foundDue.amount,
    });

    const withCfId = payment.setCfOrderId(cfResult.cfOrderId);
    await this.feePaymentRepo.save(withCfId);

    this.logger.info('Fee payment initiated', {
      feeDueId: input.feeDueId,
      orderId,
      amount: foundDue.amount,
    });

    return ok({
      orderId,
      paymentSessionId: cfResult.paymentSessionId,
      amount: foundDue.amount,
      currency: 'INR',
    });
  }
}
