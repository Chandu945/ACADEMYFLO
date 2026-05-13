import { randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRole } from '@academyflo/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { ExpenseCategoryRepository } from '@domain/expense/ports/expense-category.repository';
import { ExpenseCategory } from '@domain/expense/entities/expense-category.entity';
import { canManageExpenses } from '@domain/expense/rules/expense.rules';
import { ExpenseErrors } from '@domain/expense/errors/expense.errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface CreateCategoryInput {
  actorUserId: string;
  actorRole: UserRole;
  name: string;
}

export interface CreateCategoryOutput {
  id: string;
  name: string;
  // ISO 8601 wire format (see list-staff.usecase.ts for rationale).
  createdAt: string;
}

export class CreateCategoryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly categoryRepo: ExpenseCategoryRepository,
    private readonly auditRecorder: AuditRecorderPort,
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

    // M1 fix (expense audit): pre-fix code relied solely on the JS-side
    // findByAcademyAndName check above, which is TOCTOU-vulnerable — two
    // concurrent requests both pass the check and both succeed against the
    // case-sensitive Mongo unique index ("Travel" and "travel" land as
    // separate rows). The new (academyId, nameNormalized) partial unique
    // closes that, but we still need to map the resulting 11000 to a
    // user-facing duplicateCategory rather than a 500.
    try {
      await this.categoryRepo.save(category);
    } catch (e) {
      if ((e as { code?: number })?.code === 11000) {
        return err(ExpenseErrors.duplicateCategory());
      }
      throw e;
    }

    await this.auditRecorder.record({
      academyId: user.academyId,
      actorUserId: input.actorUserId,
      action: 'EXPENSE_CATEGORY_CREATED',
      entityType: 'EXPENSE',
      entityId: category.id.toString(),
      context: { name: trimmedName },
    });

    return ok({
      id: category.id.toString(),
      name: category.name,
      createdAt: category.audit.createdAt.toISOString(),
    });
  }
}
