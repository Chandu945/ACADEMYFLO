import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import { canViewAttendance } from '@domain/attendance/rules/attendance.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { scheduledDatesInMonth } from '@domain/attendance/value-objects/batch-schedule.vo';
import { AttendanceErrors } from '../../common/errors';
import type { MonthlyAttendanceSummaryItem } from '../dtos/attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetMonthlyAttendanceSummaryInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
  page: number;
  pageSize: number;
  search?: string;
}

export interface GetMonthlyAttendanceSummaryOutput {
  data: MonthlyAttendanceSummaryItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class GetMonthlyAttendanceSummaryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly batchRepo: BatchRepository,
  ) {}

  async execute(
    input: GetMonthlyAttendanceSummaryInput,
  ): Promise<Result<GetMonthlyAttendanceSummaryOutput, AppError>> {
    const roleCheck = canViewAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.viewNotAllowed());
    }

    if (!isValidMonthKey(input.month)) {
      return err(AppErrorClass.validation('Month must be a valid YYYY-MM format'));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    const { students, total } = await this.studentRepo.list(
      { academyId: actor.academyId, status: 'ACTIVE', search: input.search },
      input.page,
      input.pageSize,
    );
    const studentIds = students.map((s) => s.id.toString());

    const [allPresent, holidays] = await Promise.all([
      this.attendanceRepo.findPresentByAcademyAndMonth(actor.academyId, input.month),
      this.holidayRepo.findByAcademyAndMonth(actor.academyId, input.month),
    ]);

    const holidayDates = holidays.map((h) => h.date);
    const holidayCount = holidayDates.length;

    // Per-page enrollments + the matching batches, batched to avoid N+1.
    const enrollmentsByStudent = new Map<string, string[]>();
    const allBatchIds = new Set<string>();
    await Promise.all(
      studentIds.map(async (sid) => {
        const enrollments = await this.studentBatchRepo.findByStudentId(sid);
        const batchIds = enrollments.map((e) => e.batchId);
        enrollmentsByStudent.set(sid, batchIds);
        for (const id of batchIds) allBatchIds.add(id);
      }),
    );
    const batches =
      allBatchIds.size > 0 ? await this.batchRepo.findByIds([...allBatchIds]) : [];
    const batchById = new Map(batches.map((b) => [b.id.toString(), b]));

    // Cache scheduledDatesInMonth per batch to avoid recomputing per student.
    const expectedDaysCountByBatch = new Map<string, number>();
    for (const batch of batches) {
      expectedDaysCountByBatch.set(
        batch.id.toString(),
        scheduledDatesInMonth(input.month, batch.days, holidayDates).length,
      );
    }

    // Count present sessions per student (each record = one session-attendance).
    const presentCountByStudent = new Map<string, number>();
    for (const record of allPresent) {
      presentCountByStudent.set(
        record.studentId,
        (presentCountByStudent.get(record.studentId) ?? 0) + 1,
      );
    }

    const data: MonthlyAttendanceSummaryItem[] = students.map((s) => {
      const sid = s.id.toString();
      const batchIds = enrollmentsByStudent.get(sid) ?? [];
      const expectedSessions = batchIds.reduce(
        (sum, bid) => sum + (batchById.has(bid) ? expectedDaysCountByBatch.get(bid) ?? 0 : 0),
        0,
      );
      const presentCount = presentCountByStudent.get(sid) ?? 0;
      const absentCount = Math.max(0, expectedSessions - presentCount);
      return {
        studentId: sid,
        fullName: s.fullName,
        presentCount,
        absentCount,
        holidayCount,
      };
    });

    return ok({
      data,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / input.pageSize),
      },
    });
  }
}
