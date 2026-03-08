import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRole } from '@playconnect/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { ExpenseCategoryRepository } from '@domain/expense/ports/expense-category.repository';
import { canManageExpenses } from '@domain/expense/rules/expense.rules';
import { ExpenseErrors } from '@domain/expense/errors/expense.errors';

export interface ListCategoriesInput {
  actorUserId: string;
  actorRole: UserRole;
}

export interface CategoryItemDto {
  id: string;
  name: string;
}

export interface ListCategoriesOutput {
  categories: CategoryItemDto[];
}

export class ListCategoriesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly categoryRepo: ExpenseCategoryRepository,
  ) {}

  async execute(input: ListCategoriesInput): Promise<Result<ListCategoriesOutput, AppError>> {
    const check = canManageExpenses(input.actorRole);
    if (!check.allowed) return err(ExpenseErrors.notAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(ExpenseErrors.academyRequired());

    const categories = await this.categoryRepo.listByAcademy(user.academyId);

    return ok({
      categories: categories.map((c) => ({
        id: c.id.toString(),
        name: c.name,
      })),
    });
  }
}
