import type { PaidSource } from '@academyflo/contracts';

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

/**
 * Cash-collected breakdown grouped by due-month. Lets the UI show
 * "Of ₹X collected in May: ₹A for May dues, ₹B for April dues, ₹C older."
 * Sorted descending by monthKey (most recent due-month first).
 */
export interface DueMonthBreakdownDto {
  monthKey: string;
  amount: number;
  count: number;
}

export interface MonthlyRevenueSummaryDto {
  totalAmount: number;
  transactionCount: number;
  transactions: MonthlyRevenueItemDto[];
  byDueMonth: DueMonthBreakdownDto[];
}
