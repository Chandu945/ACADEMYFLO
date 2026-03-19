import { z } from 'zod';

export const monthlyRevenueItemSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  monthKey: z.string(),
  amount: z.number(),
  source: z.string(),
  receiptNumber: z.string(),
  collectedByUserId: z.string().nullable(),
  approvedByUserId: z.string().nullable(),
  createdAt: z.string(),
});

export const monthlyRevenueSummarySchema = z.object({
  totalAmount: z.number(),
  transactionCount: z.number(),
  transactions: z.array(monthlyRevenueItemSchema),
});

export const studentWiseDueItemSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  monthKey: z.string(),
  amount: z.number(),
  status: z.string(),
  pendingMonthsCount: z.number(),
  totalPendingAmount: z.number(),
});

export const studentWiseDueListSchema = z.array(studentWiseDueItemSchema);

export const studentWiseDuesPaginatedSchema = z.object({
  items: z.array(studentWiseDueItemSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const monthWiseDueItemSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  monthKey: z.string(),
  dueDate: z.string(),
  amount: z.number(),
  status: z.string(),
  paidAt: z.string().nullable(),
  paidSource: z.string().nullable(),
});

export const monthWiseDuesSummarySchema = z.object({
  month: z.string(),
  totalDues: z.number(),
  paidCount: z.number(),
  unpaidCount: z.number(),
  paidAmount: z.number(),
  unpaidAmount: z.number(),
  dues: z.array(monthWiseDueItemSchema),
});

export type MonthlyRevenueSummaryApiResponse = z.infer<typeof monthlyRevenueSummarySchema>;
export type StudentWiseDueListApiResponse = z.infer<typeof studentWiseDueListSchema>;
export type StudentWiseDuesPaginatedApiResponse = z.infer<typeof studentWiseDuesPaginatedSchema>;
export type MonthWiseDuesSummaryApiResponse = z.infer<typeof monthWiseDuesSummarySchema>;
