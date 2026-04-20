import type { PaymentRequest } from '../entities/payment-request.entity';
import type { PaymentRequestStatus } from '@academyflo/contracts';

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
  /** Cascade-delete all payment requests for a student (used when student is soft-deleted). Returns count removed. */
  deleteAllByAcademyAndStudent(academyId: string, studentId: string): Promise<number>;
}
