import type { FeePayment } from '../entities/fee-payment.entity';

export const FEE_PAYMENT_REPOSITORY = Symbol('FEE_PAYMENT_REPOSITORY');

export interface FeePaymentRepository {
  save(payment: FeePayment): Promise<void>;
  findByOrderId(orderId: string): Promise<FeePayment | null>;
  findPendingByFeeDueId(feeDueId: string): Promise<FeePayment | null>;
  findByParentAndAcademy(parentUserId: string, academyId: string): Promise<FeePayment[]>;
}
