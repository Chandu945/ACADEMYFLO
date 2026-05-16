import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewAttendance, validateMonthKey } from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { MonthDailyCountsDto, MonthDailyCountDay } from '../dtos/attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetMonthDailyCountsInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string; // YYYY-MM
}

export class GetMonthDailyCountsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(input: GetMonthDailyCountsInput): Promise<Result<MonthDailyCountsDto, AppError>> {
    const roleCheck = canViewAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.viewNotAllowed());
    }

    const monthCheck = validateMonthKey(input.month);
    if (!monthCheck.valid) {
      return err(AppErrorClass.validation(monthCheck.reason!));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    const academyId = actor.academyId;

    // Parse month to get total days
    const parts = input.month.split('-');
    const year = parseInt(parts[0]!, 10);
    const monthNum = parseInt(parts[1]!, 10);
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    // Default-present model for the monthly bar chart. Pre-fix the chart
    // reported `absent = totalStudents - present` per day, which on every
    // unmarked day inflated red bars to ~totalStudents (139), giving owners
    // a panic-grade view even though attendance simply hadn't been recorded
    // yet. The new contract: absent = number of distinct students with an
    // explicit ABSENT record that day. Unmarked = implicitly present.
    //
    // BUG-038: must compute the "expected" count per day from active students
    // who had joined by that date — using a single countActive snapshot
    // overcounts Present on days before a student joined (mirror of
    // BUG-026/032 read-side joining-date filter).
    const [activeStudents, absentRecords, holidays] = await Promise.all([
      this.studentRepo.listActiveByAcademy(academyId),
      this.attendanceRepo.findAbsentByAcademyAndMonth(academyId, input.month),
      this.holidayRepo.findByAcademyAndMonth(academyId, input.month),
    ]);

    // Sort joining keys ascending so we can sweep through the month and
    // increment a running count without re-scanning the student list per day.
    const joiningKeys = activeStudents
      .map((s) => {
        const jd = s.joiningDate;
        const y = jd.getUTCFullYear();
        const m = String(jd.getUTCMonth() + 1).padStart(2, '0');
        const d = String(jd.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      })
      .sort();

    // Distinct-student set per date — a student absent in two batches on the
    // same day must count once toward "students absent today".
    const absentByDate = new Map<string, Set<string>>();
    for (const record of absentRecords) {
      let set = absentByDate.get(record.date);
      if (!set) {
        set = new Set<string>();
        absentByDate.set(record.date, set);
      }
      set.add(record.studentId);
    }

    const holidaySet = new Set(holidays.map((h) => h.date));

    // Build day-by-day response. Holiday days short-circuit absent → 0 so the
    // chart renders the holiday flag without a misleading red bar (the
    // pre-existing isHoliday consumer already handles the gray bucket).
    const days: MonthDailyCountDay[] = [];
    let joinIdx = 0;
    let expectedCount = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${input.month}-${String(d).padStart(2, '0')}`;
      // Advance the joining-date sweep: any student whose joining key is
      // <= today's date contributes to the expected count from this day on.
      while (joinIdx < joiningKeys.length && joiningKeys[joinIdx]! <= dateStr) {
        expectedCount++;
        joinIdx++;
      }
      const isHoliday = holidaySet.has(dateStr);
      const absentCountForDay = isHoliday ? 0 : (absentByDate.get(dateStr)?.size ?? 0);
      days.push({
        date: dateStr,
        absentCount: absentCountForDay,
        isHoliday,
        expectedCount,
      });
    }

    return ok({
      month: input.month,
      // Top-level totalStudents kept for backward-compat with any consumer
      // that still reads it. The per-day `expectedCount` is the canonical
      // source of truth for the chart math now.
      totalStudents: activeStudents.length,
      days,
    });
  }
}
