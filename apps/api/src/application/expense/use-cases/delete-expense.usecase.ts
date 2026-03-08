import type { Result } from '@shared/kernel';
import { ok, err, isDeleted } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRole } from '@playconnect/contracts';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
import { canManageExpenses } from '@domain/expense/rules/expense.rules';
import { ExpenseErrors } from '@domain/expense/errors/expense.errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface DeleteExpenseInput {
  actorUserId: string;
  actorRole: UserRole;
  expenseId: string;
}

export class DeleteExpenseUseCase {
  constructor(
    private readonly expenseRepo: ExpenseRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: DeleteExpenseInput): Promise<Result<void, AppError>> {
    const check = canManageExpenses(input.actorRole);
    if (!check.allowed) return err(ExpenseErrors.notAllowed());

    const expense = await this.expenseRepo.findById(input.expenseId);
    if (!expense || isDeleted(expense.softDelete)) {
      return err(ExpenseErrors.notFound(input.expenseId));
    }

    const deleted = expense.markDeleted(input.actorUserId);
    await this.expenseRepo.save(deleted);

    await this.auditRecorder.record({
      academyId: deleted.academyId,
      actorUserId: input.actorUserId,
      action: 'EXPENSE_DELETED',
      entityType: 'EXPENSE',
      entityId: deleted.id.toString(),
    });

    return ok(undefined);
  }
}
