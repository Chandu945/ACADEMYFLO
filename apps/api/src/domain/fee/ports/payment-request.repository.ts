import type { PaymentRequest } from '../entities/payment-request.entity';
import type { PaymentRequestStatus } from '@playconnect/contracts';

export const PAYMENT_REQUEST_REPOSITORY = Symbol('PAYMENT_REQUEST_REPOSITORY');

export interface PaymentRequestRepository {
  save(request: PaymentRequest): Promise<void>;
  findById(id: string): Promise<PaymentRequest | null>;
  findPendingByFeeDue(feeDueId: string): Promise<PaymentRequest | null>;
  listByAcademyAndStatuses(
    academyId: string,
    statuses: PaymentRequestStatus[],
  ): Promise<PaymentRequest[]>;
  listByStaffAndAcademy(staffUserId: string, academyId: string): Promise<PaymentRequest[]>;
  countPendingByAcademy(academyId: string): Promise<number>;
}
