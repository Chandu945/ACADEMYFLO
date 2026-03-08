import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRole } from '@playconnect/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
import { canManageExpenses } from '@domain/expense/rules/expense.rules';
import { ExpenseErrors } from '@domain/expense/errors/expense.errors';

export interface ListExpensesInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
  categoryId?: string;
  page: number;
  pageSize: number;
}

export interface ExpenseItemDto {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

export interface ListExpensesOutput {
  data: ExpenseItemDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class ListExpensesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly expenseRepo: ExpenseRepository,
  ) {}

  async execute(input: ListExpensesInput): Promise<Result<ListExpensesOutput, AppError>> {
    const check = canManageExpenses(input.actorRole);
    if (!check.allowed) return err(ExpenseErrors.notAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(ExpenseErrors.academyRequired());

    const { data, total } = await this.expenseRepo.listByAcademy(user.academyId, {
      month: input.month,
      categoryId: input.categoryId,
      page: input.page,
      pageSize: input.pageSize,
    });

    return ok({
      data: data.map((e) => ({
        id: e.id.toString(),
        date: e.date,
        categoryId: e.categoryId,
        categoryName: e.categoryName,
        amount: e.amount,
        notes: e.notes,
        createdAt: e.audit.createdAt.toISOString(),
      })),
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / input.pageSize),
      },
    });
  }
}
