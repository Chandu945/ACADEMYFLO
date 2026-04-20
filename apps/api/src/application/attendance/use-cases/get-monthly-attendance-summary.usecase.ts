import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewAttendance } from '@domain/attendance/rules/attendance.rules';
import { isValidMonthKey, getDaysInMonth } from '@domain/attendance/value-objects/local-date.vo';
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

    // Get ACTIVE students paginated
    const { students, total } = await this.studentRepo.list(
      { academyId: actor.academyId, status: 'ACTIVE', search: input.search },
      input.page,
      input.pageSize,
    );

    // Get all present records and holidays for the month in bulk
    const [allPresent, holidays] = await Promise.all([
      this.attendanceRepo.findPresentByAcademyAndMonth(actor.academyId, input.month),
      this.holidayRepo.findByAcademyAndMonth(actor.academyId, input.month),
    ]);

    const holidayCount = holidays.length;
    const holidayDateSet = new Set(holidays.map((h) => h.date));
    const daysInMonth = getDaysInMonth(input.month);

    // Build present count and overlap count per student (records now mean PRESENT)
    const presentCountMap = new Map<string, number>();
    const overlapCountMap = new Map<string, number>();
    for (const record of allPresent) {
      presentCountMap.set(record.studentId, (presentCountMap.get(record.studentId) ?? 0) + 1);
      if (holidayDateSet.has(record.date)) {
        overlapCountMap.set(record.studentId, (overlapCountMap.get(record.studentId) ?? 0) + 1);
      }
    }

    const data: MonthlyAttendanceSummaryItem[] = students.map((s) => {
      const presentCount = presentCountMap.get(s.id.toString()) ?? 0;
      const overlapCount = overlapCountMap.get(s.id.toString()) ?? 0;
      const absentCount = Math.max(0, daysInMonth - presentCount - holidayCount + overlapCount);
      return {
        studentId: s.id.toString(),
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
