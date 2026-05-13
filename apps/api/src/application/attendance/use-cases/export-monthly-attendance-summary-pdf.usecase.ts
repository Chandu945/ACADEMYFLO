import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PdfRenderer } from '@application/reports/ports/pdf-renderer.port';
import type {
  GetMonthlyAttendanceSummaryUseCase,
  GetMonthlyAttendanceSummaryOutput,
} from './get-monthly-attendance-summary.usecase';
import { AttendanceErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

export interface ExportMonthlyAttendanceSummaryPdfInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

const PAGE_SIZE = 200;
const MAX_PAGES = 50; // Safety cap: 200 × 50 = 10k students.

export class ExportMonthlyAttendanceSummaryPdfUseCase {
  constructor(
    private readonly getSummary: GetMonthlyAttendanceSummaryUseCase,
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async execute(input: ExportMonthlyAttendanceSummaryPdfInput): Promise<Result<Buffer, AppError>> {
    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(AttendanceErrors.academyRequired());

    const academy = await this.academyRepo.findById(actor.academyId);
    const academyName = academy?.academyName ?? 'Academy';

    // Page through to collect all students. The on-screen view paginates;
    // an export needs everyone in one document.
    const rows: {
      fullName: string;
      expectedDays: number;
      presentDays: number;
      absentDays: number;
      percentage: number | null;
    }[] = [];
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
        rows.push({
          fullName: item.fullName,
          expectedDays: expected,
          presentDays: item.presentCount,
          absentDays: item.absentCount,
          percentage: expected > 0 ? Math.round((item.presentCount / expected) * 100) : null,
        });
      }
      if (page >= data.meta.totalPages) break;
    }

    const pdf = await this.pdfRenderer.renderMonthlyAttendanceSummary({
      academyName,
      month: input.month,
      rows,
    });

    return ok(pdf);
  }
}
