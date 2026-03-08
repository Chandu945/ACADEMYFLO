import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';

export type SaveExpenseApiPort = {
  createExpense(data: {
    categoryId: string;
    date: string;
    amount: number;
    notes?: string;
  }): Promise<Result<{ id: string }, AppError>>;
  updateExpense(
    id: string,
    data: {
      categoryId?: string;
      date?: string;
      amount?: number;
      notes?: string;
    },
  ): Promise<Result<{ id: string }, AppError>>;
};

export type SaveExpenseDeps = {
  expenseApi: SaveExpenseApiPort;
};

export type SaveExpenseInput =
  | {
      mode: 'create';
      categoryId: string;
      date: string;
      amount: number;
      notes?: string;
    }
  | {
      mode: 'edit';
      id: string;
      categoryId?: string;
      date?: string;
      amount?: number;
      notes?: string;
    };

export async function saveExpenseUseCase(
  deps: SaveExpenseDeps,
  input: SaveExpenseInput,
): Promise<Result<{ id: string }, AppError>> {
  if (input.mode === 'create') {
    return deps.expenseApi.createExpense({
      categoryId: input.categoryId,
      date: input.date,
      amount: input.amount,
      notes: input.notes,
    });
  }

  return deps.expenseApi.updateExpense(input.id, {
    categoryId: input.categoryId,
    date: input.date,
    amount: input.amount,
    notes: input.notes,
  });
}
