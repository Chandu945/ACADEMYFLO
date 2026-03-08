import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';

export type DeleteExpenseApiPort = {
  deleteExpense(id: string): Promise<Result<void, AppError>>;
};

export type DeleteExpenseDeps = {
  expenseApi: DeleteExpenseApiPort;
};

export async function deleteExpenseUseCase(
  deps: DeleteExpenseDeps,
  expenseId: string,
): Promise<Result<void, AppError>> {
  return deps.expenseApi.deleteExpense(expenseId);
}
