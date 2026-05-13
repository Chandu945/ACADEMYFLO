import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type {
  GetMonthlyAttendanceSummaryUseCase,
  GetMonthlyAttendanceSummaryOutput,
} from './get-monthly-attendance-summary.usecase';
import type { UserRole } from '@academyflo/contracts';

export interface ExportMonthlyAttendanceSummaryCsvInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export class ExportMonthlyAttendanceSummaryCsvUseCase {
  constructor(private readonly getSummary: GetMonthlyAttendanceSummaryUseCase) {}

  async execute(input: ExportMonthlyAttendanceSummaryCsvInput): Promise<Result<string, AppError>> {
    const lines: string[] = [
      ['Student', 'Expected Days', 'Present Days', 'Absent Days', 'Holidays', 'Attendance %']
        .map(csvEscape)
        .join(','),
    ];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const pageResult = await this.getSummary.execute({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        month: input.month,
        page,
        pageSize: PAGE_SIZE,
      });
      if (!pageResult.ok) return err(pageResult.error);
      const data: GetMonthlyAttendanceSummaryOutput = pageResult.value;
      for (const item of data.data) {
        const expected = item.presentCount + item.absentCount;
        const pct = expected > 0 ? Math.round((item.presentCount / expected) * 100) : '';
        lines.push(
          [item.fullName, expected, item.presentCount, item.absentCount, item.holidayCount, pct]
            .map(csvEscape)
            .join(','),
        );
      }
      if (page >= data.meta.totalPages) break;
    }

    // Sort: worst attendance first. Students with no data (empty %) sort last.
    // Note: 0% must sort BEFORE 1%, so we can't use `parseInt(...) || 101`
    // (because `0 || 101` evaluates to 101). Use NaN check instead.
    const header = lines[0]!;
    const dataRows = lines.slice(1).sort((a, b) => {
      const aPct = parseInt(a.split(',').pop() ?? '', 10);
      const bPct = parseInt(b.split(',').pop() ?? '', 10);
      const aKey = Number.isNaN(aPct) ? 101 : aPct;
      const bKey = Number.isNaN(bPct) ? 101 : bPct;
      return aKey - bKey;
    });
    return ok([header, ...dataRows].join('\n'));
  }
}
