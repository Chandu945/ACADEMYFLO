import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewAttendance, validateLocalDate } from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { DailyAttendanceReportDto } from '../dtos/attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetDailyAttendanceReportInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
}

export class GetDailyAttendanceReportUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(
    input: GetDailyAttendanceReportInput,
  ): Promise<Result<DailyAttendanceReportDto, AppError>> {
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

    if (isHoliday) {
      return ok({
        date: input.date,
        isHoliday: true,
        presentCount: 0,
        absentCount: 0,
        absentStudents: [],
      });
    }

    // Get all ACTIVE students
    const allActiveStudents = await this.studentRepo.listActiveByAcademy(actor.academyId);
    const totalActive = allActiveStudents.length;

    // Get all present records for the day (records now mean PRESENT)
    const presentRecords = await this.attendanceRepo.findPresentByAcademyAndDate(
      actor.academyId,
      input.date,
    );

    // Distinct students present in any batch today. With batch-scoped records
    // a two-batch student would otherwise be counted twice in presentRecords.
    const presentSet = new Set(presentRecords.map((r) => r.studentId));
    const distinctPresent = presentSet.size;

    // Absent students = all active students who do NOT have a present record
    const absentStudents: { studentId: string; fullName: string }[] = [];
    for (const s of allActiveStudents) {
      if (!presentSet.has(s.id.toString())) {
        absentStudents.push({ studentId: s.id.toString(), fullName: s.fullName });
      }
    }

    return ok({
      date: input.date,
      isHoliday: false,
      presentCount: distinctPresent,
      absentCount: Math.max(0, totalActive - distinctPresent),
      absentStudents,
    });
  }
}
