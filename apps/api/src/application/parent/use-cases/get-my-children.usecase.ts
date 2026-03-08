import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { getDaysInMonth } from '@domain/attendance/value-objects/local-date.vo';
import { ParentErrors } from '../../common/errors';
import type { ChildSummaryDto } from '../dtos/parent.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetMyChildrenInput {
  parentUserId: string;
  parentRole: UserRole;
}

export class GetMyChildrenUseCase {
  constructor(
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(input: GetMyChildrenInput): Promise<Result<ChildSummaryDto[], AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return ok([]);

    const studentIds = links.map((l) => l.studentId);
    const students = await this.studentRepo.findByIds(studentIds);

    // Current month attendance percentage
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = getDaysInMonth(currentMonth);

    // Build academyId set from links for holiday loading
    const academyIds = [...new Set(links.map((l) => l.academyId))];
    const holidaysByAcademy = new Map<string, number>();
    await Promise.all(
      academyIds.map(async (aid) => {
        const holidays = await this.holidayRepo.findByAcademyAndMonth(aid, currentMonth);
        holidaysByAcademy.set(aid, holidays.length);
      }),
    );

    // Map studentId -> academyId from links
    const studentAcademy = new Map(links.map((l) => [l.studentId, l.academyId]));

    const summaries: ChildSummaryDto[] = await Promise.all(
      students.map(async (s) => {
        const sid = s.id.toString();
        const academyId = studentAcademy.get(sid) ?? s.academyId;
        let currentMonthAttendancePercent: number | null = null;

        try {
          const absentRecords = await this.attendanceRepo.findAbsentByAcademyStudentAndMonth(
            academyId,
            sid,
            currentMonth,
          );
          const holidayCount = holidaysByAcademy.get(academyId) ?? 0;
          const present = Math.max(0, daysInMonth - absentRecords.length - holidayCount);
          currentMonthAttendancePercent = Math.round((present / daysInMonth) * 100);
        } catch {
          // If attendance data unavailable, leave as null
        }

        return {
          studentId: sid,
          fullName: s.fullName,
          status: s.status,
          monthlyFee: s.monthlyFee,
          academyId: s.academyId,
          currentMonthAttendancePercent,
        };
      }),
    );

    return ok(summaries);
  }
}
