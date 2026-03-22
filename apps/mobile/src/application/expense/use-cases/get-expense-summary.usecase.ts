import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { ExpenseSummary } from '../../../domain/expense/expense.types';
import {
  expenseSummarySchema,
  type ExpenseSummaryApiResponse,
} from '../../../domain/expense/expense.schemas';

export type SummaryApiPort = {
  getExpenseSummary(month: string): Promise<Result<ExpenseSummaryApiResponse, AppError>>;
};

export type GetExpenseSummaryDeps = {
  expenseApi: SummaryApiPort;
};

export async function getExpenseSummaryUseCase(
  deps: GetExpenseSummaryDeps,
  month: string,
): Promise<Result<ExpenseSummary, AppError>> {
  const result = await deps.expenseApi.getExpenseSummary(month);

  if (!result.ok) {
    return result;
  }

  const parsed = expenseSummarySchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
