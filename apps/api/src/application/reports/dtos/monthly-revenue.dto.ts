import type { PaidSource } from '@playconnect/contracts';

export interface MonthlyRevenueItemDto {
  id: string;
  studentId: string;
  monthKey: string;
  amount: number;
  source: PaidSource;
  receiptNumber: string;
  collectedByUserId: string;
  approvedByUserId: string;
  createdAt: string;
}

export interface MonthlyRevenueSummaryDto {
  totalAmount: number;
  transactionCount: number;
  transactions: MonthlyRevenueItemDto[];
}
