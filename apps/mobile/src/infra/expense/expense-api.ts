import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import type {
  ExpenseCategoryListApiResponse,
  ExpenseListApiResponse,
  ExpenseSummaryApiResponse,
} from '../../domain/expense/expense.schemas';
import { apiGet, apiPost, apiPut, apiDelete } from '../http/api-client';

export function listExpenses(query: {
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
  return apiGet<ExpenseListApiResponse>(`/api/v1/expenses?${parts.join('&')}`);
}

export function getExpenseSummary(
  month: string,
): Promise<Result<ExpenseSummaryApiResponse, AppError>> {
  return apiGet<ExpenseSummaryApiResponse>(
    `/api/v1/expenses/summary?month=${encodeURIComponent(month)}`,
  );
}

export function createExpense(data: {
  categoryId: string;
  date: string;
  amount: number;
  notes?: string;
}): Promise<Result<{ id: string }, AppError>> {
  return apiPost<{ id: string }>('/api/v1/expenses', data);
}

export function updateExpense(
  id: string,
  data: {
    categoryId?: string;
    date?: string;
    amount?: number;
    notes?: string;
  },
): Promise<Result<{ id: string }, AppError>> {
  return apiPut<{ id: string }>(`/api/v1/expenses/${id}`, data);
}

export function deleteExpense(id: string): Promise<Result<void, AppError>> {
  return apiDelete<void>(`/api/v1/expenses/${id}`);
}

export function listCategories(): Promise<Result<ExpenseCategoryListApiResponse, AppError>> {
  return apiGet<ExpenseCategoryListApiResponse>('/api/v1/expense-categories');
}

export function createCategory(
  name: string,
): Promise<Result<{ id: string; name: string; createdAt: string }, AppError>> {
  return apiPost<{ id: string; name: string; createdAt: string }>('/api/v1/expense-categories', {
    name,
  });
}

export function deleteCategory(id: string): Promise<Result<{ deleted: boolean }, AppError>> {
  return apiDelete<{ deleted: boolean }>(`/api/v1/expense-categories/${id}`);
}
