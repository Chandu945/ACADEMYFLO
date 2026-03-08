import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
import { canViewDashboard } from '@domain/fee/rules/fee.rules';
import { FeeErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface GetMonthlyChartInput {
  actorUserId: string;
  actorRole: UserRole;
  year: number;
}

export interface MonthlyChartPoint {
  month: string;
  income: number;
  expense: number;
}

export interface MonthlyChartDto {
  year: number;
  data: MonthlyChartPoint[];
}

export class GetMonthlyChartUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
    private readonly expenseRepo: ExpenseRepository,
  ) {}

  async execute(input: GetMonthlyChartInput): Promise<Result<MonthlyChartDto, AppError>> {
    const check = canViewDashboard(input.actorRole);
    if (!check.allowed) return err(FeeErrors.dashboardNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;
    const year = input.year;

    const from = new Date(year, 0, 1, 0, 0, 0, 0);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);
    const fromMonth = `${year}-01`;
    const toMonth = `${year}-12`;

    const [incomeData, expenseData] = await Promise.all([
      this.transactionLogRepo.sumRevenueByAcademyGroupedByMonth(academyId, from, to),
      this.expenseRepo.sumByAcademyGroupedByMonth(academyId, fromMonth, toMonth),
    ]);

    const incomeMap = new Map(incomeData.map((d) => [d.month, d.total]));
    const expenseMap = new Map(expenseData.map((d) => [d.month, d.total]));

    const data: MonthlyChartPoint[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${String(m).padStart(2, '0')}`;
      data.push({
        month: monthKey,
        income: incomeMap.get(monthKey) ?? 0,
        expense: expenseMap.get(monthKey) ?? 0,
      });
    }

    return ok({ year, data });
  }
}
