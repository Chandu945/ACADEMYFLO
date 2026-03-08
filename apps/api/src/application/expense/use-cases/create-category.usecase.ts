import { randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRole } from '@playconnect/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { ExpenseCategoryRepository } from '@domain/expense/ports/expense-category.repository';
import { ExpenseCategory } from '@domain/expense/entities/expense-category.entity';
import { canManageExpenses } from '@domain/expense/rules/expense.rules';
import { ExpenseErrors } from '@domain/expense/errors/expense.errors';

export interface CreateCategoryInput {
  actorUserId: string;
  actorRole: UserRole;
  name: string;
}

export interface CreateCategoryOutput {
  id: string;
  name: string;
  createdAt: Date;
}

export class CreateCategoryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly categoryRepo: ExpenseCategoryRepository,
  ) {}

  async execute(input: CreateCategoryInput): Promise<Result<CreateCategoryOutput, AppError>> {
    const check = canManageExpenses(input.actorRole);
    if (!check.allowed) return err(ExpenseErrors.notAllowed());

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length > 50) {
      return err(ExpenseErrors.invalidCategoryName());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(ExpenseErrors.academyRequired());

    const existing = await this.categoryRepo.findByAcademyAndName(user.academyId, trimmedName);
    if (existing) return err(ExpenseErrors.duplicateCategory());

    const category = ExpenseCategory.create({
      id: randomUUID(),
      academyId: user.academyId,
      name: trimmedName,
      createdBy: input.actorUserId,
    });

    await this.categoryRepo.save(category);

    return ok({
      id: category.id.toString(),
      name: category.name,
      createdAt: category.audit.createdAt,
    });
  }
}
