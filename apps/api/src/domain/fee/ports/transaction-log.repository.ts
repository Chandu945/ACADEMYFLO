import type { TransactionLog } from '../entities/transaction-log.entity';

export const TRANSACTION_LOG_REPOSITORY = Symbol('TRANSACTION_LOG_REPOSITORY');

export interface TransactionLogRepository {
  save(log: TransactionLog): Promise<void>;
  findByPaymentRequestId(paymentRequestId: string): Promise<TransactionLog | null>;
  listByAcademy(
    academyId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: TransactionLog[]; total: number }>;
  countByAcademyAndPrefix(academyId: string, prefix: string): Promise<number>;
  /**
   * Atomically increment and return the next receipt sequence number for an academy/prefix.
   * Uses MongoDB's atomic findOneAndUpdate with $inc to guarantee uniqueness even under
   * concurrent transactions (prevents race conditions in receipt number generation).
   */
  incrementReceiptCounter(academyId: string, prefix: string): Promise<number>;
  sumRevenueByAcademyAndDateRange(academyId: string, from: Date, to: Date): Promise<number>;
  listByAcademyAndDateRange(academyId: string, from: Date, to: Date): Promise<TransactionLog[]>;
  findByFeeDueId(feeDueId: string): Promise<TransactionLog | null>;
  listByStudentIds(studentIds: string[]): Promise<TransactionLog[]>;
  sumRevenueByAcademyGroupedByMonth(
    academyId: string,
    from: Date,
    to: Date,
  ): Promise<{ month: string; total: number }[]>;
}
