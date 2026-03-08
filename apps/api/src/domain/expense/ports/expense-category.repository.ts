import type { ExpenseCategory } from '../entities/expense-category.entity';

export const EXPENSE_CATEGORY_REPOSITORY = Symbol('EXPENSE_CATEGORY_REPOSITORY');

export interface ExpenseCategoryRepository {
  save(category: ExpenseCategory): Promise<void>;
  findById(id: string): Promise<ExpenseCategory | null>;
  findByAcademyAndName(academyId: string, name: string): Promise<ExpenseCategory | null>;
  listByAcademy(academyId: string): Promise<ExpenseCategory[]>;
  deleteById(id: string): Promise<void>;
}
