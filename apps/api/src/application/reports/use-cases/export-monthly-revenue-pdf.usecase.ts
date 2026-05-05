import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { PdfRenderer } from '../ports/pdf-renderer.port';
import { canViewReports } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey, getDaysInMonth } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { MonthlyRevenueItemDto } from '../dtos/monthly-revenue.dto';
import type { UserRole } from '@academyflo/contracts';

export interface ExportMonthlyRevenuePdfInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

export class ExportMonthlyRevenuePdfUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async execute(input: ExportMonthlyRevenuePdfInput): Promise<Result<Buffer, AppError>> {
    const check = canViewReports(input.actorRole);
    if (!check.allowed) return err(FeeErrors.reportsNotAllowed());

    if (!isValidMonthKey(input.month)) return err(FeeErrors.invalidMonthKey());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;

    const [year, month] = input.month.split('-').map(Number);
    const from = new Date(year!, month! - 1, 1, 0, 0, 0, 0);
    const daysInMonth = getDaysInMonth(input.month);
    const to = new Date(year!, month! - 1, daysInMonth, 23, 59, 59, 999);

    const logs = await this.transactionLogRepo.listByAcademyAndDateRange(academyId, from, to);

    const transactions: MonthlyRevenueItemDto[] = logs.map((log) => ({
      id: log.id.toString(),
      studentId: log.studentId,
      monthKey: log.monthKey,
      amount: log.amount,
      source: log.source,
      receiptNumber: log.receiptNumber,
      collectedByUserId: log.collectedByUserId,
      approvedByUserId: log.approvedByUserId,
      createdAt: log.audit.createdAt.toISOString(),
    }));

    const totalAmount = logs.reduce((sum, l) => sum + l.amount, 0);

    // Mirror the breakdown the on-screen report shows so the exported PDF
    // tells the same cash-vs-accrual story.
    const byDueMonthMap = new Map<string, { amount: number; count: number }>();
    for (const l of logs) {
      const cur = byDueMonthMap.get(l.monthKey) ?? { amount: 0, count: 0 };
      cur.amount += l.amount;
      cur.count += 1;
      byDueMonthMap.set(l.monthKey, cur);
    }
    const byDueMonth = Array.from(byDueMonthMap.entries())
      .map(([monthKey, v]) => ({ monthKey, amount: v.amount, count: v.count }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    const pdf = await this.pdfRenderer.renderMonthlyRevenue(input.month, {
      totalAmount,
      transactionCount: logs.length,
      transactions,
      byDueMonth,
    });

    return ok(pdf);
  }
}
