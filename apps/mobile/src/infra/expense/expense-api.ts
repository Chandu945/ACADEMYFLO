import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import {
  expenseCategoryListSchema,
  expenseListResponseSchema,
  expenseSummarySchema,
  expenseMutationResponseSchema,
  expenseCategoryCreateResponseSchema,
  expenseCategoryDeleteResponseSchema,
  type ExpenseCategoryListApiResponse,
  type ExpenseListApiResponse,
  type ExpenseSummaryApiResponse,
  type ExpenseMutationApiResponse,
} from '../../domain/expense/expense.schemas';
import { apiGet, apiPost, apiPut, apiDelete } from '../http/api-client';
import type { ZodSchema } from 'zod';

// Same validateResponse pattern as student/staff/enquiry/event APIs.
// Backend drift surfaces as a clear VALIDATION instead of `undefined.foo`
// crashes deep in expense screens.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[expenseApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function listExpenses(query: {
  month: string;
  categoryId?: string;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<Result<ExpenseListApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`month=${encodeURIComponent(query.month)}`);
  parts.push(`page=${encodeURIComponent(String(query.page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(query.pageSize))}`);
  if (query.categoryId) parts.push(`categoryId=${encodeURIComponent(query.categoryId)}`);
  if (query.search) parts.push(`search=${encodeURIComponent(query.search)}`);
  const result = await apiGet<unknown>(`/api/v1/expenses?${parts.join('&')}`);
  return validateResponse(
    expenseListResponseSchema as unknown as ZodSchema<ExpenseListApiResponse>,
    result,
    'listExpenses',
  );
}

export async function getExpenseSummary(
  month: string,
): Promise<Result<ExpenseSummaryApiResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/expenses/summary?month=${encodeURIComponent(month)}`,
  );
  return validateResponse(
    expenseSummarySchema as unknown as ZodSchema<ExpenseSummaryApiResponse>,
    result,
    'getExpenseSummary',
  );
}

export async function createExpense(data: {
  categoryId: string;
  date: string;
  amount: number;
  notes?: string;
}): Promise<Result<ExpenseMutationApiResponse, AppError>> {
  const result = await apiPost<unknown>('/api/v1/expenses', data);
  return validateResponse(expenseMutationResponseSchema, result, 'createExpense');
}

export async function updateExpense(
  id: string,
  data: {
    categoryId?: string;
    date?: string;
    amount?: number;
    notes?: string;
  },
): Promise<Result<ExpenseMutationApiResponse, AppError>> {
  const result = await apiPut<unknown>(`/api/v1/expenses/${encodeURIComponent(id)}`, data);
  return validateResponse(expenseMutationResponseSchema, result, 'updateExpense');
}

export function deleteExpense(id: string): Promise<Result<void, AppError>> {
  // No body to validate; relying on HTTP status.
  return apiDelete<void>(`/api/v1/expenses/${encodeURIComponent(id)}`);
}

export async function listCategories(): Promise<Result<ExpenseCategoryListApiResponse, AppError>> {
  const result = await apiGet<unknown>('/api/v1/expense-categories');
  return validateResponse(
    expenseCategoryListSchema as unknown as ZodSchema<ExpenseCategoryListApiResponse>,
    result,
    'listCategories',
  );
}

export async function createCategory(
  name: string,
): Promise<Result<{ id: string; name: string; createdAt: string }, AppError>> {
  const result = await apiPost<unknown>('/api/v1/expense-categories', { name });
  return validateResponse(expenseCategoryCreateResponseSchema, result, 'createCategory');
}

export async function deleteCategory(id: string): Promise<Result<{ deleted: boolean }, AppError>> {
  const result = await apiDelete<unknown>(`/api/v1/expense-categories/${encodeURIComponent(id)}`);
  return validateResponse(expenseCategoryDeleteResponseSchema, result, 'deleteCategory');
}
