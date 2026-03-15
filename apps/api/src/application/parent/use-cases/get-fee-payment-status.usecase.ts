import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { FeePaymentRepository } from '@domain/parent/ports/fee-payment.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { CashfreeGatewayPort } from '@domain/subscription-payments/ports/cashfree-gateway.port';
import type { ClockPort } from '@application/common/clock.port';
import type { TransactionPort } from '@application/common/transaction.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { TransactionLog } from '@domain/fee/entities/transaction-log.entity';
import { generateReceiptNumber } from '@domain/fee/rules/payment-request.rules';
import { DEFAULT_RECEIPT_PREFIX } from '@playconnect/contracts';
import { randomUUID } from 'node:crypto';
import type { FeePaymentStatusOutput } from '../dtos/parent.dto';

export class GetFeePaymentStatusUseCase {
  constructor(
    private readonly feePaymentRepo: FeePaymentRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly cashfreeGateway: CashfreeGatewayPort,
    private readonly clock: ClockPort,
    private readonly transaction: TransactionPort,
    private readonly logger: LoggerPort,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(
    parentUserId: string,
    orderId: string,
  ): Promise<Result<FeePaymentStatusOutput, AppError>> {
    let payment = await this.feePaymentRepo.findByOrderId(orderId);
    if (!payment) return err(AppErrorClass.notFound('FeePayment', orderId));

    if (payment.parentUserId !== parentUserId) {
      return err(AppErrorClass.forbidden('You do not have access to this payment'));
    }

    // Server-side verification: if PENDING, check with Cashfree directly
    if (payment.status === 'PENDING') {
      try {
        const cfOrder = await this.cashfreeGateway.getOrder(payment.orderId);

        if (cfOrder.orderStatus === 'PAID') {
          const now = this.clock.now();
          const providerPaymentId = `verified_${cfOrder.cfOrderId}`;
          const updated = payment.markSuccess(providerPaymentId, now);

          const feeDue = await this.feeDueRepo.findById(payment.feeDueId);

          if (!feeDue) {
            const failedPayment = payment.markFailed('FEE_DUE_NOT_FOUND');
            await this.feePaymentRepo.save(failedPayment);
            this.logger.error('Fee due not found during server-side verification', {
              orderId,
              feeDueId: payment.feeDueId,
            });
            payment = failedPayment;
          } else if (feeDue.status === 'PAID') {
            // Fee already paid (e.g. by owner manually) — still record payment SUCCESS
            await this.transaction.run(async () => {
              const transitioned = await this.feePaymentRepo.saveWithStatusPrecondition(updated, 'PENDING');
              if (!transitioned) {
                this.logger.info('Fee payment already transitioned — skipping', { orderId });
              }
            });
            this.logger.warn('Fee already paid but online payment collected — needs reconciliation', {
              orderId,
              feeDueId: payment.feeDueId,
            });
            payment = (await this.feePaymentRepo.findByOrderId(orderId)) ?? updated;
          } else {
            // Normal flow: mark fee due as paid and create transaction log
            const paidDue = feeDue.markPaidByParentOnline(payment.parentUserId, now, payment.lateFeeSnapshot);

            const academy = await this.academyRepo.findById(payment.academyId);
            const prefix = academy?.receiptPrefix ?? DEFAULT_RECEIPT_PREFIX;
            const count = await this.transactionLogRepo.countByAcademyAndPrefix(payment.academyId, prefix);
            const receiptNumber = generateReceiptNumber(prefix, count + 1);

            const txLog = TransactionLog.create({
              id: randomUUID(),
              academyId: payment.academyId,
              feeDueId: payment.feeDueId,
              paymentRequestId: null,
              studentId: payment.studentId,
              monthKey: payment.monthKey,
              amount: payment.baseAmount,
              source: 'PARENT_ONLINE',
              collectedByUserId: payment.parentUserId,
              approvedByUserId: payment.parentUserId,
              receiptNumber,
            });

            await this.transaction.run(async () => {
              const transitioned = await this.feePaymentRepo.saveWithStatusPrecondition(updated, 'PENDING');
              if (!transitioned) {
                this.logger.info('Fee payment already transitioned — skipping', { orderId });
                return;
              }
              await this.feeDueRepo.save(paidDue);
              await this.transactionLogRepo.save(txLog);
            });

            this.logger.info('Server-side verification: fee payment SUCCESS', {
              orderId,
              feeDueId: payment.feeDueId,
              academyId: payment.academyId,
            });

            await this.auditRecorder.record({
              academyId: payment.academyId,
              actorUserId: payment.parentUserId,
              action: 'FEE_PAYMENT_COMPLETED',
              entityType: 'FEE_PAYMENT',
              entityId: orderId,
              context: {
                feeDueId: payment.feeDueId,
                studentId: payment.studentId,
                monthKey: payment.monthKey,
                baseAmount: String(payment.baseAmount),
                providerPaymentId,
                receiptNumber,
                verifiedBy: 'server_poll',
              },
            });

            // Re-load to get updated status
            payment = (await this.feePaymentRepo.findByOrderId(orderId)) ?? updated;
          }
        } else if (cfOrder.orderStatus === 'EXPIRED') {
          const expired = payment.markFailed('ORDER_EXPIRED');
          await this.feePaymentRepo.save(expired);
          payment = expired;
          this.logger.info('Server-side verification: order expired', { orderId });
        }
        // Otherwise (ACTIVE) — still pending, continue polling
      } catch (error) {
        // Cashfree unreachable — return current PENDING status
        this.logger.warn('Server-side verification failed, returning cached status', {
          orderId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    return ok({
      orderId: payment.orderId,
      status: payment.status,
      baseAmount: payment.baseAmount,
      convenienceFee: payment.convenienceFee,
      totalAmount: payment.totalAmount,
      providerPaymentId: payment.providerPaymentId,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    });
  }
}
