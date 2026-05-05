import type { FeeDueStatus, PaidSource } from '@academyflo/contracts';

export interface MonthWiseDueItemDto {
  id: string;
  studentId: string;
  studentName: string;
  monthKey: string;
  dueDate: string;
  amount: number;
  /**
   * Late fee. For PAID rows: what was actually collected (snapshotted at
   * approval). For unpaid rows: computed dynamically from today's date and
   * the effective late-fee config.
   */
  lateFee: number;
  /** amount + lateFee — the canonical "what's owed / was owed" number. */
  totalPayable: number;
  status: FeeDueStatus;
  paidAt: string | null;
  paidSource: PaidSource | null;
}

export interface MonthWiseDuesSummaryDto {
  month: string;
  totalDues: number;
  paidCount: number;
  unpaidCount: number;
  /** Sum of totalPayable for paid rows (base + late fee actually collected). */
  paidAmount: number;
  /** Sum of totalPayable for unpaid rows (base + current late fee). */
  unpaidAmount: number;
  dues: MonthWiseDueItemDto[];
}
