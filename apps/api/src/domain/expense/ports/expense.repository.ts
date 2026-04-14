import type { Expense } from '../entities/expense.entity';

export const EXPENSE_REPOSITORY = Symbol('EXPENSE_REPOSITORY');

export interface ExpenseRepository {
  save(expense: Expense): Promise<void>;
  findById(id: string): Promise<Expense | null>;
  listByAcademy(
    academyId: string,
    filter: {
      month: string;
      categoryId?: string;
      search?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ data: Expense[]; total: number }>;
  sumByAcademyAndMonth(academyId: string, month: string): Promise<number>;
  sumByAcademyAndDateRange(academyId: string, from: Date, to: Date): Promise<number>;
  summarizeByCategory(
    academyId: string,
    month: string,
  ): Promise<{ category: string; total: number }[]>;
  countByCategoryId(academyId: string, categoryId: string): Promise<number>;
  sumByAcademyGroupedByMonth(
    academyId: string,
    fromMonth: string,
    toMonth: string,
  ): Promise<{ month: string; total: number }[]>;
}
