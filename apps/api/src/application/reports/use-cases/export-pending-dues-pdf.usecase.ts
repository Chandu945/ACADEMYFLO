import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { PdfRenderer } from '../ports/pdf-renderer.port';
import { canViewReports } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { StudentWiseDueItemDto } from '../dtos/student-wise-dues.dto';
import type { UserRole } from '@academyflo/contracts';

export interface ExportPendingDuesPdfInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

export class ExportPendingDuesPdfUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async execute(input: ExportPendingDuesPdfInput): Promise<Result<Buffer, AppError>> {
    const check = canViewReports(input.actorRole);
    if (!check.allowed) return err(FeeErrors.reportsNotAllowed());

    if (!isValidMonthKey(input.month)) return err(FeeErrors.invalidMonthKey());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;

    const [monthDues, allUnpaidRaw] = await Promise.all([
      this.feeDueRepo.listByAcademyAndMonth(academyId, input.month),
      this.feeDueRepo.listUnpaidByAcademy(academyId),
    ]);

    // Sanity cap: a runaway academy with 50k+ unpaid dues would OOM the PDF
    // path. Truncate and log so we degrade rather than crash; product can
    // tighten if this ever fires legitimately.
    const MAX_UNPAID_ROWS = 5000;
    if (allUnpaidRaw.length > MAX_UNPAID_ROWS) {
      console.warn(
        `[export-pending-dues-pdf] academy=${academyId} unpaid=${allUnpaidRaw.length} > cap=${MAX_UNPAID_ROWS}; truncating`,
      );
    }
    const allUnpaid = allUnpaidRaw.slice(0, MAX_UNPAID_ROWS);

    const unpaidByStudent = new Map<string, { count: number; totalAmount: number }>();
    for (const due of allUnpaid) {
      const existing = unpaidByStudent.get(due.studentId) ?? { count: 0, totalAmount: 0 };
      existing.count += 1;
      existing.totalAmount += due.amount;
      unpaidByStudent.set(due.studentId, existing);
    }

    // Batch student lookups to avoid N+1 — a 200-student academy was making
    // 200 sequential findById calls and timing out the PDF endpoint.
    const studentIds = [...new Set(monthDues.map((d) => d.studentId))];
    const students = await this.studentRepo.findByIds(studentIds);
    const studentMap = new Map<string, string>(
      students.map((s) => [s.id.toString(), s.fullName]),
    );

    const items: StudentWiseDueItemDto[] = monthDues.map((due) => {
      const unpaid = unpaidByStudent.get(due.studentId) ?? { count: 0, totalAmount: 0 };
      return {
        studentId: due.studentId,
        studentName: studentMap.get(due.studentId) ?? 'Unknown',
        monthKey: due.monthKey,
        amount: due.amount,
        status: due.status,
        pendingMonthsCount: unpaid.count,
        totalPendingAmount: unpaid.totalAmount,
      };
    });

    const pdf = await this.pdfRenderer.renderPendingDues(input.month, items);

    return ok(pdf);
  }
}
