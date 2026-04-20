import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRole } from '@academyflo/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
import { canManageExpenses } from '@domain/expense/rules/expense.rules';
import { ExpenseErrors } from '@domain/expense/errors/expense.errors';

export interface GetExpenseSummaryInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

export interface ExpenseSummaryOutput {
  categories: { category: string; total: number }[];
  totalAmount: number;
}

export class GetExpenseSummaryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly expenseRepo: ExpenseRepository,
  ) {}

  async execute(
    input: GetExpenseSummaryInput,
  ): Promise<Result<ExpenseSummaryOutput, AppError>> {
    const check = canManageExpenses(input.actorRole);
    if (!check.allowed) return err(ExpenseErrors.notAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(ExpenseErrors.academyRequired());

    const [categories, totalAmount] = await Promise.all([
      this.expenseRepo.summarizeByCategory(user.academyId, input.month),
      this.expenseRepo.sumByAcademyAndMonth(user.academyId, input.month),
    ]);

    return ok({ categories, totalAmount });
  }
}
