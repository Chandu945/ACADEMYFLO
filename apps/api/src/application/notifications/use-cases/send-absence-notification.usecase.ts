import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { PushNotificationService } from '../push-notification.service';
import type { LoggerPort } from '@shared/logging/logger.port';
import { buildStudentAbsentPush } from '../templates/student-absent-template';

export interface SendAbsenceNotificationInput {
  academyId: string;
  studentId: string;
  batchId: string;
  /** YYYY-MM-DD IST. */
  date: string;
}

export type SendAbsenceNotificationOutcome =
  | { sent: true; parentCount: number }
  | { sent: false; reason: SkipReason };

export type SkipReason =
  | 'student_not_found'
  | 'student_not_active'
  | 'holiday_declared'
  | 'now_present'
  | 'no_parent_link';

/**
 * Fire-time logic for the delayed absence push. All re-checks live here, so
 * the system never needs to actively cancel scheduled jobs on holiday
 * declarations, student deactivations, parent unlinks, or any other state
 * change — they all surface as a skip reason at firing.
 */
export class SendAbsenceNotificationUseCase {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly parentLinkRepo: ParentStudentLinkRepository,
    private readonly pushService: PushNotificationService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    input: SendAbsenceNotificationInput,
  ): Promise<Result<SendAbsenceNotificationOutcome, never>> {
    const ctx = {
      academyId: input.academyId,
      studentId: input.studentId,
      batchId: input.batchId,
      date: input.date,
    };

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      this.logger.info('absence-notif: skipped (student_not_found)', ctx);
      return ok({ sent: false, reason: 'student_not_found' });
    }
    if (student.status !== 'ACTIVE') {
      this.logger.info('absence-notif: skipped (student_not_active)', ctx);
      return ok({ sent: false, reason: 'student_not_active' });
    }
    if (student.academyId !== input.academyId) {
      // Defensive — shouldn't happen unless the student was moved across
      // academies after scheduling. Treat as deletion.
      this.logger.warn('absence-notif: skipped (student moved academy)', ctx);
      return ok({ sent: false, reason: 'student_not_found' });
    }

    const holiday = await this.holidayRepo.findByAcademyAndDate(input.academyId, input.date);
    if (holiday) {
      this.logger.info('absence-notif: skipped (holiday_declared)', ctx);
      return ok({ sent: false, reason: 'holiday_declared' });
    }

    // BUG-033: must filter on status === 'PRESENT'. In the default-present
    // model, both PRESENT and ABSENT are explicit rows on the unique
    // (academyId, studentId, batchId, date) key. The ABSENT row that
    // triggered the schedule still exists at fire time — treating any row
    // as "now present" would short-circuit every dispatch with the wrong
    // skip reason. The variable rename to `existingRecord` makes the
    // intent of the row read explicit so future readers don't slide back
    // into the old "row-exists-means-present" mental model.
    const existingRecord = await this.attendanceRepo.findByAcademyStudentBatchDate(
      input.academyId,
      input.studentId,
      input.batchId,
      input.date,
    );
    if (existingRecord && existingRecord.status === 'PRESENT') {
      // Coach toggled them back to PRESENT after the cancel was missed (or
      // raced). Defensive — the cancel should have removed the job, but
      // re-checking the DB is the source of truth.
      this.logger.info('absence-notif: skipped (now_present)', ctx);
      return ok({ sent: false, reason: 'now_present' });
    }

    const links = await this.parentLinkRepo.findByStudentId(input.studentId);
    if (links.length === 0) {
      this.logger.info('absence-notif: skipped (no_parent_link)', ctx);
      return ok({ sent: false, reason: 'no_parent_link' });
    }

    const parentUserIds = links.map((l) => l.parentUserId);
    const message = buildStudentAbsentPush({
      studentName: student.fullName,
      academyId: input.academyId,
      studentId: input.studentId,
      batchId: input.batchId,
      date: input.date,
    });

    // PushNotificationService handles device-token lookup + stale token
    // cleanup. If none of the parents have devices registered, it logs and
    // returns silently — the use-case still reports "sent" since dispatch
    // happened from our side.
    await this.pushService.sendToUsers(parentUserIds, message);

    this.logger.info('absence-notif: dispatched', { ...ctx, parentCount: parentUserIds.length });
    return ok({ sent: true, parentCount: parentUserIds.length });
  }
}
