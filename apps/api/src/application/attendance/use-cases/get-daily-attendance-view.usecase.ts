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
import { canViewAttendance, validateLocalDate } from '@domain/attendance/rules/attendance.rules';
import { formatLocalDate } from '../../../shared/date-utils';
import { AttendanceErrors } from '../../common/errors';
import type { DailyAttendanceViewItem } from '../dtos/attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetDailyAttendanceViewInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
  page: number;
  pageSize: number;
  batchId?: string;
  search?: string;
}

export interface GetDailyAttendanceViewOutput {
  date: string;
  isHoliday: boolean;
  data: DailyAttendanceViewItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class GetDailyAttendanceViewUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly studentBatchRepo?: StudentBatchRepository,
    private readonly batchRepo?: BatchRepository,
  ) {}

  async execute(
    input: GetDailyAttendanceViewInput,
  ): Promise<Result<GetDailyAttendanceViewOutput, AppError>> {
    const roleCheck = canViewAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.viewNotAllowed());
    }

    const dateCheck = validateLocalDate(input.date);
    if (!dateCheck.valid) {
      return err(AppErrorClass.validation(dateCheck.reason!));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    const holiday = await this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date);
    const isHoliday = holiday !== null;

    let students;
    let total: number;

    if (input.batchId && this.studentBatchRepo) {
      // Verify batch ownership before reading students (prevent IDOR / cross-tenant access)
      if (this.batchRepo) {
        const batch = await this.batchRepo.findById(input.batchId);
        if (!batch || batch.academyId !== actor.academyId) {
          return err(AttendanceErrors.batchNotInAcademy());
        }
      }

      // Filter by batch: get student IDs in batch, then fetch ACTIVE students
      const batchAssignments = await this.studentBatchRepo.findByBatchId(input.batchId);
      const studentIds = batchAssignments.map((a) => a.studentId);

      if (studentIds.length === 0) {
        return ok({
          date: input.date,
          isHoliday,
          data: [],
          meta: { page: input.page, pageSize: input.pageSize, totalItems: 0, totalPages: 0 },
        });
      }

      const allBatchStudents = await this.studentRepo.findByIds(studentIds);
      let activeStudents = allBatchStudents.filter(
        (s) => s.status === 'ACTIVE' && s.academyId === actor.academyId
          && (!s.joiningDate || formatLocalDate(s.joiningDate) <= input.date),
      );

      if (input.search) {
        const searchLower = input.search.trim().toLowerCase();
        activeStudents = activeStudents.filter((s) =>
          s.fullName.toLowerCase().startsWith(searchLower),
        );
      }

      // Manual pagination
      total = activeStudents.length;
      const start = (input.page - 1) * input.pageSize;
      students = activeStudents.slice(start, start + input.pageSize);
    } else {
      // Default: all ACTIVE students who have joined on or before the selected date
      const result = await this.studentRepo.list(
        { academyId: actor.academyId, status: 'ACTIVE', search: input.search },
        input.page,
        input.pageSize,
      );
      // Filter out students who joined after the selected date
      students = result.students.filter(
        (s) => !s.joiningDate || formatLocalDate(s.joiningDate) <= input.date,
      );
      total = result.total;
    }

    if (isHoliday) {
      return ok({
        date: input.date,
        isHoliday: true,
        data: students.map((s) => ({
          studentId: s.id.toString(),
          fullName: s.fullName,
          status: 'HOLIDAY' as const,
        })),
        meta: {
          page: input.page,
          pageSize: input.pageSize,
          totalItems: total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      });
    }

    // When the caller scopes to a batch, only that batch's records count as
    // "present" on this screen — a student present in their morning batch but
    // absent in evening should show ABSENT on the evening view.
    const presentRecords = input.batchId
      ? await this.attendanceRepo.findPresentByAcademyBatchAndDate(
          actor.academyId,
          input.batchId,
          input.date,
        )
      : await this.attendanceRepo.findPresentByAcademyAndDate(actor.academyId, input.date);
    const presentSet = new Set(presentRecords.map((r) => r.studentId));

    const data: DailyAttendanceViewItem[] = students.map((s) => ({
      studentId: s.id.toString(),
      fullName: s.fullName,
      status: presentSet.has(s.id.toString()) ? ('PRESENT' as const) : ('ABSENT' as const),
    }));

    return ok({
      date: input.date,
      isHoliday: false,
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
