import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { ExpenseItem } from '../../../domain/expense/expense.types';
import {
  expenseListResponseSchema,
  type ExpenseListApiResponse,
} from '../../../domain/expense/expense.schemas';

export type ExpenseApiPort = {
  listExpenses(query: {
    month: string;
    categoryId?: string;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<Result<ExpenseListApiResponse, AppError>>;
};

export type ListExpensesDeps = {
  expenseApi: ExpenseApiPort;
};

export type ListExpensesResult = {
  items: ExpenseItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function listExpensesUseCase(
  deps: ListExpensesDeps,
  month: string,
  page: number,
  pageSize: number,
  categoryId?: string,
  search?: string,
): Promise<Result<ListExpensesResult, AppError>> {
  const result = await deps.expenseApi.listExpenses({ month, categoryId, search, page, pageSize });

  if (!result.ok) {
    return result;
  }

  const parsed = expenseListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok({
    items: parsed.data.data as ExpenseItem[],
    meta: parsed.data.meta,
  });
}
