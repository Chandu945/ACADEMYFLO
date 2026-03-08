import type { TransactionLog } from '../entities/transaction-log.entity';

export const TRANSACTION_LOG_REPOSITORY = Symbol('TRANSACTION_LOG_REPOSITORY');

export interface TransactionLogRepository {
  save(log: TransactionLog): Promise<void>;
  findByPaymentRequestId(paymentRequestId: string): Promise<TransactionLog | null>;
  listByAcademy(academyId: string, page: number, pageSize: number): Promise<TransactionLog[]>;
  countByAcademyAndPrefix(academyId: string, prefix: string): Promise<number>;
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
