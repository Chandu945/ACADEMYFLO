import type { FeeDueStatus } from '@playconnect/contracts';

export interface StudentWiseDueItemDto {
  studentId: string;
  studentName: string;
  monthKey: string;
  amount: number;
  status: FeeDueStatus;
  pendingMonthsCount: number;
  totalPendingAmount: number;
}
