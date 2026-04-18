import type { FeeDue } from '../entities/fee-due.entity';
import type { FeeDueStatus } from '@playconnect/contracts';

export const FEE_DUE_REPOSITORY = Symbol('FEE_DUE_REPOSITORY');

export interface FeeDueRepository {
  save(feeDue: FeeDue): Promise<void>;
  bulkSave(feeDues: FeeDue[]): Promise<void>;
  findById(id: string): Promise<FeeDue | null>;
  bulkUpdateStatus(ids: string[], status: FeeDueStatus, expectedCurrentStatus?: FeeDueStatus): Promise<void>;
  findByAcademyStudentMonth(
    academyId: string,
    studentId: string,
    monthKey: string,
  ): Promise<FeeDue | null>;
  listByAcademyMonthAndStatuses(
    academyId: string,
    monthKey: string,
    statuses: FeeDueStatus[],
  ): Promise<FeeDue[]>;
  listByAcademyMonthPaid(academyId: string, monthKey: string): Promise<FeeDue[]>;
  listByStudentAndRange(
    academyId: string,
    studentId: string,
    fromMonth: string,
    toMonth: string,
  ): Promise<FeeDue[]>;
  listUpcomingByAcademyAndMonth(academyId: string, monthKey: string): Promise<FeeDue[]>;
  listByAcademyAndMonth(academyId: string, monthKey: string): Promise<FeeDue[]>;
  listUnpaidByAcademy(academyId: string): Promise<FeeDue[]>;
  /**
   * DB-side SUM of unpaid fee amounts across the academy (statuses UPCOMING + DUE).
   * Avoids round-tripping every fee-due document just to compute a single total
   * — see `GetOwnerDashboardKpisUseCase`.
   */
  sumUnpaidAmountByAcademy(academyId: string): Promise<number>;
  /**
   * DB-side DISTINCT-count of students with at least one unpaid fee
   * (UPCOMING or DUE) in the given month.
   */
  countDistinctUnpaidStudentsByAcademyAndMonth(
    academyId: string,
    monthKey: string,
  ): Promise<number>;
  findUnpaidByDueDate(dueDate: string): Promise<FeeDue[]>;
  findOverdueDues(upToDate: string): Promise<FeeDue[]>;
  findDueWithoutSnapshot(academyId: string): Promise<FeeDue[]>;
  deleteUpcomingByStudent(academyId: string, studentId: string): Promise<number>;
  /**
   * DB-side SUM of lateFeeApplied for PAID fee dues in a given academy + month.
   */
  sumLateFeeCollectedByAcademyAndMonth(academyId: string, monthKey: string): Promise<number>;
  /**
   * DB-side COUNT of fee dues with status='DUE' and dueDate <= today.
   */
  countOverdueByAcademy(academyId: string, today: string): Promise<number>;
  /**
   * List all overdue fee dues for a given academy (status='DUE', dueDate <= today).
   */
  listOverdueByAcademy(academyId: string, today: string): Promise<FeeDue[]>;
}
