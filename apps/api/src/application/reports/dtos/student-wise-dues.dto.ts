import type { FeeDueStatus } from '@academyflo/contracts';

export interface StudentWiseDueItemDto {
  studentId: string;
  studentName: string;
  monthKey: string;
  amount: number;
  status: FeeDueStatus;
  pendingMonthsCount: number;
  totalPendingAmount: number;
}
