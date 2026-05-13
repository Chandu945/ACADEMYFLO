import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { scheduledDatesInMonth } from '@domain/attendance/value-objects/batch-schedule.vo';
import { getTodayLocalDate } from '@domain/attendance/value-objects/local-date.vo';
import { ParentErrors } from '../../common/errors';
import type { ChildSummaryDto } from '../dtos/parent.dto';
import type { UserRole } from '@academyflo/contracts';
import { computeLateFee } from '@academyflo/contracts';
import { formatLocalDate } from '../../../shared/date-utils';
import {
  buildEffectiveLateFeeConfig,
  buildLateFeeConfigFromAcademy,
} from '../../fee/common/late-fee';
import type { LateFeeConfig } from '@academyflo/contracts';

export interface GetMyChildrenInput {
  parentUserId: string;
  parentRole: UserRole;
}

/** Shift "YYYY-MM" by `delta` months (negative goes back). */
function monthKeyOffset(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}`;
}

function toLocalDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export class GetMyChildrenUseCase {
  constructor(
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly batchRepo: BatchRepository,
    /**
     * Needed for the M2 fix (parent-flows audit): the dashboard's
     * `totalUnpaidAmount` and `currentMonthFeeAmount` previously used
     * `lateFeeApplied` (which is only persisted at PAID time, so always 0
     * for unpaid items). That under-reported the real bill and contradicted
     * the per-child fees screen, which already computes the dynamic late
     * fee. Now both screens use the same buildEffectiveLateFeeConfig +
     * computeLateFee path. Optional so legacy fixtures keep working —
     * without it, the dashboard falls back to base amount only.
     */
    private readonly academyRepo?: AcademyRepository,
  ) {}

  async execute(input: GetMyChildrenInput): Promise<Result<ChildSummaryDto[], AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return ok([]);

    const studentIds = links.map((l) => l.studentId);
    const students = await this.studentRepo.findByIds(studentIds);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Pre-load holidays per academy (one cache key per academy in scope).
    const academyIds = [...new Set(links.map((l) => l.academyId))];
    const holidayDatesByAcademy = new Map<string, string[]>();
    await Promise.all(
      academyIds.map(async (aid) => {
        const holidays = await this.holidayRepo.findByAcademyAndMonth(aid, currentMonth);
        holidayDatesByAcademy.set(
          aid,
          holidays.map((h) => h.date),
        );
      }),
    );

    const studentAcademy = new Map(links.map((l) => [l.studentId, l.academyId]));

    // M2 fix (parent-flows audit): pre-load each in-scope academy's live
    // late-fee config so we can apply the same dynamic-late-fee math the
    // per-child fees screen uses. Per-academy cache so a parent linked to
    // five kids in one academy only hits the academy repo once.
    const liveConfigByAcademy = new Map<string, LateFeeConfig | undefined>();
    if (this.academyRepo) {
      await Promise.all(
        academyIds.map(async (aid) => {
          const academy = await this.academyRepo!.findById(aid);
          liveConfigByAcademy.set(aid, buildLateFeeConfigFromAcademy(academy));
        }),
      );
    }
    const todayStr = formatLocalDate(new Date());

    const summaries: ChildSummaryDto[] = await Promise.all(
      students.map(async (s) => {
        const sid = s.id.toString();
        const academyId = studentAcademy.get(sid) ?? s.academyId;
        const holidayDates = holidayDatesByAcademy.get(academyId) ?? [];
        let currentMonthAttendancePercent: number | null = null;

        try {
          const [presentRecords, enrollments] = await Promise.all([
            this.attendanceRepo.findPresentByAcademyStudentAndMonth(academyId, sid, currentMonth),
            this.studentBatchRepo.findByStudentId(sid),
          ]);

          if (enrollments.length > 0) {
            // Day-based percent so it matches what the owner/staff and the
            // child-detail screens show. Apply the same joining-date and
            // per-batch enrollment-date caps to avoid charging absences for
            // time before the student or the batch enrollment started.
            const batches = await this.batchRepo.findByIds(enrollments.map((e) => e.batchId));
            const today = getTodayLocalDate();
            const monthStart = `${currentMonth}-01`;
            const studentJoinKey = toLocalDateKey(s.joiningDate);
            const studentEffectiveStart = studentJoinKey > monthStart ? studentJoinKey : monthStart;
            const enrolStartByBatch = new Map<string, string>();
            for (const enrol of enrollments) {
              const enrolKey = toLocalDateKey(enrol.assignedAt);
              enrolStartByBatch.set(
                enrol.batchId,
                enrolKey > studentEffectiveStart ? enrolKey : studentEffectiveStart,
              );
            }
            const expectedDates = new Set<string>();
            for (const b of batches) {
              const enrolStart = enrolStartByBatch.get(b.id.toString()) ?? studentEffectiveStart;
              const dates = scheduledDatesInMonth(currentMonth, b.days, holidayDates, today);
              for (const d of dates) {
                if (d >= enrolStart) expectedDates.add(d);
              }
            }
            const presentDates = new Set(presentRecords.map((r) => r.date));
            let presentDayCount = 0;
            for (const d of expectedDates) {
              if (presentDates.has(d)) presentDayCount++;
            }
            if (expectedDates.size > 0) {
              currentMonthAttendancePercent = Math.round(
                (presentDayCount / expectedDates.size) * 100,
              );
            } else {
              currentMonthAttendancePercent = null;
            }
          }
        } catch {
          // If attendance/enrollment data unavailable, leave as null.
        }

        // Surface the OLDEST unpaid fee (DUE or UPCOMING) — older dues take
        // priority so the backlog gets cleared in order and late fees apply
        // to the right month. Falls back to current-month fee if no backlog.
        let currentMonthFeeDueId: string | null = null;
        let currentMonthFeeAmount: number | null = null;
        let currentMonthFeeStatus: ChildSummaryDto['currentMonthFeeStatus'] = null;
        let currentMonthFeeMonthKey: string | null = null;
        let totalUnpaidMonths = 0;
        let totalUnpaidAmount = 0;
        try {
          // Look back 24 months — generous safety margin for any realistic
          // backlog. Anything older than that is unlikely to be settled
          // through the app and probably needs admin intervention.
          const fromMonth = monthKeyOffset(currentMonth, -24);
          const fees = await this.feeDueRepo.listByStudentAndRange(
            academyId,
            sid,
            fromMonth,
            currentMonth,
          );
          // listByStudentAndRange returns sorted ASC by monthKey already.
          const unpaid = fees.filter((f) => f.status === 'DUE' || f.status === 'UPCOMING');
          totalUnpaidMonths = unpaid.length;

          // M2 fix: compute the dynamic late fee per unpaid fee using the
          // same path as get-child-fees.usecase. `lateFeeApplied` on an
          // unpaid record is always 0 (only set at PAID time), so the prior
          // sum hid late-fee growth from the parent's dashboard. We honour
          // the per-fee snapshot (a fee that flipped to DUE under an old
          // policy keeps that rate) and fall back to the live config when
          // there's no snapshot yet.
          const liveConfig = liveConfigByAcademy.get(academyId);
          const lateFeeFor = (f: (typeof unpaid)[number]): number => {
            const effective = buildEffectiveLateFeeConfig(f.lateFeeConfigSnapshot, liveConfig);
            if (!effective) return 0;
            const rawDate = f.dueDate as unknown as Date | string;
            const dueDateStr =
              typeof rawDate === 'string'
                ? rawDate.slice(0, 10)
                : new Date(rawDate).toISOString().slice(0, 10);
            const computed = computeLateFee(dueDateStr, todayStr, effective);
            return Number.isFinite(computed) ? computed : 0;
          };

          totalUnpaidAmount = unpaid.reduce((sum, f) => sum + f.amount + lateFeeFor(f), 0);

          const oldest = unpaid[0];
          if (oldest) {
            currentMonthFeeDueId = oldest.id.toString();
            currentMonthFeeAmount = oldest.amount + lateFeeFor(oldest);
            currentMonthFeeStatus = oldest.status;
            currentMonthFeeMonthKey = oldest.monthKey;
          }
        } catch {
          // If fee due unavailable, keep nulls — UI falls back to monthlyFee.
        }

        return {
          studentId: sid,
          fullName: s.fullName,
          status: s.status,
          monthlyFee: s.monthlyFee,
          academyId: s.academyId,
          currentMonthAttendancePercent,
          currentMonthFeeDueId,
          currentMonthFeeAmount,
          currentMonthFeeStatus,
          currentMonthFeeMonthKey,
          totalUnpaidMonths,
          totalUnpaidAmount,
        };
      }),
    );

    return ok(summaries);
  }
}
