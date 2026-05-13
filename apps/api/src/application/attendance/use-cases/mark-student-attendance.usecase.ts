import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import { StudentAttendance } from '@domain/attendance/entities/student-attendance.entity';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import {
  canMarkAttendance,
  validateLocalDate,
  validateAttendanceStatus,
  validateDateRange,
} from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { StudentAttendanceStatus, UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { AbsenceNotificationSchedulerPort } from '../../notifications/ports/absence-notification-scheduler.port';
import { formatLocalDate } from '@shared/date-utils';
import { randomUUID } from 'crypto';

export interface MarkStudentAttendanceInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  batchId: string;
  date: string;
  status: string;
}

export interface MarkStudentAttendanceOutput {
  studentId: string;
  batchId: string;
  date: string;
  status: StudentAttendanceStatus;
}

export class MarkStudentAttendanceUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly auditRecorder: AuditRecorderPort,
    /**
     * Optional so legacy test fixtures and any non-DI callers don't break.
     * Production wiring always provides one; absence is treated as "no
     * notifications" — equivalent to running without Redis.
     */
    private readonly absenceScheduler?: AbsenceNotificationSchedulerPort,
  ) {}

  async execute(
    input: MarkStudentAttendanceInput,
  ): Promise<Result<MarkStudentAttendanceOutput, AppError>> {
    const roleCheck = canMarkAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.markNotAllowed());
    }

    const dateCheck = validateLocalDate(input.date);
    if (!dateCheck.valid) {
      return err(AppErrorClass.validation(dateCheck.reason!));
    }

    const dateRangeCheck = validateDateRange(input.date);
    if (!dateRangeCheck.valid) {
      return err(AppErrorClass.validation(dateRangeCheck.reason!));
    }

    const statusCheck = validateAttendanceStatus(input.status);
    if (!statusCheck.valid) {
      return err(AppErrorClass.validation(statusCheck.reason!));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(AttendanceErrors.studentNotFound(input.studentId));
    }

    if (student.academyId !== actor.academyId) {
      return err(AttendanceErrors.studentNotInAcademy());
    }

    // H2 fix (attendance audit): allow attendance edits for INACTIVE/LEFT
    // students if the target date predates their status change. Real
    // scenario: owner forgets to mark May 20 for a student who departed
    // June 1 — they need to backfill May after the status change. Prior
    // code blocked the backfill outright with `studentNotActive`. The
    // student WAS active on the target date, which is what matters for
    // attendance. We use `statusChangedAt` as the cutoff — anything strictly
    // before it was during the prior status (ACTIVE).
    if (student.status !== 'ACTIVE') {
      const statusChangedAt = student.statusChangedAt;
      const wasActiveOnDate =
        statusChangedAt !== null && input.date < formatLocalDate(statusChangedAt);
      if (!wasActiveOnDate) {
        return err(AttendanceErrors.studentNotActive(input.studentId));
      }
    }

    const batch = await this.batchRepo.findById(input.batchId);
    if (!batch) {
      return err(AttendanceErrors.batchNotFound(input.batchId));
    }
    if (batch.academyId !== actor.academyId) {
      return err(AttendanceErrors.batchNotInAcademy());
    }

    // Confirm enrollment so a typo in batchId can't silently insert orphan rows.
    const studentBatches = await this.studentBatchRepo.findByStudentId(input.studentId);
    if (!studentBatches.some((sb) => sb.batchId === input.batchId)) {
      return err(AttendanceErrors.studentNotInBatch());
    }

    // Check holiday
    const holiday = await this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date);
    if (holiday) {
      return err(AttendanceErrors.holidayDeclared());
    }

    // Default-present model: both PRESENT and ABSENT are explicit rows.
    // Upserting on (academyId, studentId, batchId, date) means a toggle
    // (PRESENT ↔ ABSENT) overwrites the prior row's status rather than
    // creating duplicates. The save() helper already does upsert under the
    // unique index, so a fresh row is created on first mark and the status
    // flips on subsequent marks. ABSENT used to be modelled as deletion;
    // see schema docstring for migration notes.
    const existing = await this.attendanceRepo.findByAcademyStudentBatchDate(
      actor.academyId,
      input.studentId,
      input.batchId,
      input.date,
    );
    const desiredStatus = input.status as 'PRESENT' | 'ABSENT';
    const needsWrite = !existing || existing.status !== desiredStatus;
    if (needsWrite) {
      const record = StudentAttendance.create({
        id: existing?.id.toString() ?? randomUUID(),
        academyId: actor.academyId,
        studentId: input.studentId,
        batchId: input.batchId,
        date: input.date,
        markedByUserId: input.actorUserId,
        status: desiredStatus,
      });
      try {
        await this.attendanceRepo.save(record);
      } catch (e) {
        // Concurrent marks (two coaches tapping the same student within
        // milliseconds) both pass the existence check and both attempt the
        // upsert. The unique index on (academyId, studentId, batchId, date)
        // serialises them — the second hits 11000 if it tried to insert a
        // duplicate. The desired state is already achieved by the other
        // call, so treat as idempotent success.
        if ((e as { code?: number })?.code !== 11000) throw e;
      }
    }

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'STUDENT_ATTENDANCE_EDITED',
      entityType: 'STUDENT_ATTENDANCE',
      entityId: input.studentId,
      context: {
        studentId: input.studentId,
        batchId: input.batchId,
        date: input.date,
        status: input.status,
      },
    });

    // Schedule (or cancel) the parent push. Best-effort — a scheduling outage
    // must NEVER fail the attendance write, since attendance is canonical and
    // notifications are advisory.
    if (this.absenceScheduler) {
      const mark = {
        academyId: actor.academyId,
        studentId: input.studentId,
        batchId: input.batchId,
        date: input.date,
      };
      try {
        if (input.status === 'ABSENT') {
          await this.absenceScheduler.schedule(mark);
        } else {
          await this.absenceScheduler.cancel(mark);
        }
      } catch {
        // Swallow — the scheduler logs internally. Returning ok is the
        // correct outcome: the coach's tap was honored in storage.
      }
    }

    return ok({
      studentId: input.studentId,
      batchId: input.batchId,
      date: input.date,
      status: input.status as StudentAttendanceStatus,
    });
  }
}
