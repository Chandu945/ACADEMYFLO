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
import type { UserRole } from '@playconnect/contracts';

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

    // Get total ACTIVE students count
    const { total: totalActive } = await this.studentRepo.list(
      { academyId: actor.academyId, status: 'ACTIVE' },
      1,
      1,
    );

    // Get all absent records for the day
    const absentRecords = await this.attendanceRepo.findAbsentByAcademyAndDate(
      actor.academyId,
      input.date,
    );

    // Resolve absent student names
    const absentStudents: { studentId: string; fullName: string }[] = [];
    for (const record of absentRecords) {
      const student = await this.studentRepo.findById(record.studentId);
      if (student) {
        absentStudents.push({
          studentId: student.id.toString(),
          fullName: student.fullName,
        });
      }
    }

    return ok({
      date: input.date,
      isHoliday: false,
      presentCount: totalActive - absentRecords.length,
      absentCount: absentRecords.length,
      absentStudents,
    });
  }
}
