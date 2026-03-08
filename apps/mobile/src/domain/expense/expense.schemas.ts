import { z } from 'zod';

export const expenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const expenseCategoryListSchema = z.object({
  categories: z.array(expenseCategorySchema),
});

export const expenseItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  amount: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const expenseListResponseSchema = z.object({
  data: z.array(expenseItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const expenseSummarySchema = z.object({
  categories: z.array(
    z.object({
      category: z.string(),
      total: z.number(),
    }),
  ),
  totalAmount: z.number(),
});

export type ExpenseCategoryListApiResponse = z.infer<typeof expenseCategoryListSchema>;
export type ExpenseListApiResponse = z.infer<typeof expenseListResponseSchema>;
export type ExpenseSummaryApiResponse = z.infer<typeof expenseSummarySchema>;
