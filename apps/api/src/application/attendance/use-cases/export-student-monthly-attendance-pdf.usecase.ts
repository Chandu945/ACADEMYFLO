import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PdfRenderer } from '@application/reports/ports/pdf-renderer.port';
import type { GetStudentMonthlyAttendanceUseCase } from './get-student-monthly-attendance.usecase';
import { AttendanceErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

export interface ExportStudentMonthlyAttendancePdfInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  month: string;
}

export interface ExportStudentMonthlyAttendancePdfOutput {
  pdf: Buffer;
  studentName: string;
}

export class ExportStudentMonthlyAttendancePdfUseCase {
  constructor(
    private readonly getDetail: GetStudentMonthlyAttendanceUseCase,
    private readonly studentRepo: StudentRepository,
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async execute(
    input: ExportStudentMonthlyAttendancePdfInput,
  ): Promise<Result<ExportStudentMonthlyAttendancePdfOutput, AppError>> {
    const detailResult = await this.getDetail.execute({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      studentId: input.studentId,
      month: input.month,
    });
    if (!detailResult.ok) return err(detailResult.error);

    const student = await this.studentRepo.findById(input.studentId);
    if (!student) return err(AttendanceErrors.studentNotFound(input.studentId));

    const detail = detailResult.value;
    const pdf = await this.pdfRenderer.renderStudentMonthlyAttendance({
      studentName: student.fullName,
      month: detail.month,
      expectedDays: detail.expectedDays,
      presentDays: detail.presentDays,
      absentDays: detail.absentDays,
      partialDays: detail.partialDays,
      holidayCount: detail.holidayCount,
      perBatch: detail.perBatch.map((b) => ({
        batchName: b.batchName,
        expectedCount: b.expectedCount,
        presentCount: b.presentCount,
      })),
      absentDates: detail.absentDates,
      holidayDates: detail.holidayDates,
    });

    return ok({ pdf, studentName: student.fullName });
  }
}
