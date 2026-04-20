import type { FeeDueStatus, PaidSource } from '@academyflo/contracts';

export interface MonthWiseDueItemDto {
  id: string;
  studentId: string;
  studentName: string;
  monthKey: string;
  dueDate: string;
  amount: number;
  status: FeeDueStatus;
  paidAt: string | null;
  paidSource: PaidSource | null;
}

export interface MonthWiseDuesSummaryDto {
  month: string;
  totalDues: number;
  paidCount: number;
  unpaidCount: number;
  paidAmount: number;
  unpaidAmount: number;
  dues: MonthWiseDueItemDto[];
}
