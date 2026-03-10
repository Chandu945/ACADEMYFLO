import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { FeePaymentRepository } from '@domain/parent/ports/fee-payment.repository';
import type { FeePaymentStatusOutput } from '../dtos/parent.dto';

export class GetFeePaymentStatusUseCase {
  constructor(
    private readonly feePaymentRepo: FeePaymentRepository,
  ) {}

  async execute(
    parentUserId: string,
    orderId: string,
  ): Promise<Result<FeePaymentStatusOutput, AppError>> {
    const payment = await this.feePaymentRepo.findByOrderId(orderId);
    if (!payment) return err(AppErrorClass.notFound('FeePayment', orderId));

    if (payment.parentUserId !== parentUserId) {
      return err(AppErrorClass.forbidden('You do not have access to this payment'));
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
