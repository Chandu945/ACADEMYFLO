import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import { StaffAttendance } from '@domain/staff-attendance/entities/staff-attendance.entity';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canMarkStaffAttendance } from '@domain/staff-attendance/rules/staff-attendance.rules';
import {
  validateLocalDate,
  validateAttendanceStatus,
  validateDateRange,
} from '@domain/attendance/rules/attendance.rules';
import { StaffAttendanceErrors } from '../../common/errors';
import type { StaffAttendanceViewStatus, UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { formatLocalDate } from '@shared/date-utils';
import { randomUUID } from 'crypto';

export interface MarkStaffAttendanceInput {
  actorUserId: string;
  actorRole: UserRole;
  staffUserId: string;
  date: string;
  status: string;
}

export interface MarkStaffAttendanceOutput {
  staffUserId: string;
  date: string;
  status: StaffAttendanceViewStatus;
}

export class MarkStaffAttendanceUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly staffAttendanceRepo: StaffAttendanceRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(
    input: MarkStaffAttendanceInput,
  ): Promise<Result<MarkStaffAttendanceOutput, AppError>> {
    const roleCheck = canMarkStaffAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StaffAttendanceErrors.markNotAllowed());
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
      return err(StaffAttendanceErrors.academyRequired());
    }

    const staffUser = await this.userRepo.findById(input.staffUserId);
    if (!staffUser || staffUser.role !== 'STAFF') {
      return err(StaffAttendanceErrors.staffNotFound(input.staffUserId));
    }

    if (staffUser.academyId !== actor.academyId) {
      return err(StaffAttendanceErrors.staffNotInAcademy());
    }

    if (!staffUser.isActive()) {
      return err(StaffAttendanceErrors.staffNotActive());
    }

    // BUG-037: block writes for dates before the staff member's startDate.
    // Mirrors the per-batch enrollment guard for students (BUG-032). When
    // startDate is null (legacy seeded staff or pre-feature accounts), skip
    // the check — treat as "joined long ago" so we don't break existing
    // workflows. The matching read-side filter lives in
    // get-daily-staff-attendance-view + get-monthly-staff-attendance-summary.
    if (staffUser.startDate) {
      const startedOn = formatLocalDate(staffUser.startDate);
      if (input.date < startedOn) {
        return err(StaffAttendanceErrors.dateBeforeStartDate(startedOn));
      }
    }

    // Staff attendance is required even on holidays — no holiday check
    // (unlike student attendance which blocks on holidays)

    // BUG-036: track whether this call actually mutated the DB so we only
    // record an audit entry when something changed. The pre-fix code wrote
    // an audit row on every call including no-ops (mark PRESENT when
    // already PRESENT, mark ABSENT when already ABSENT) which polluted the
    // owner-visible audit log with thousands of empty events.
    let didChange = false;

    if (input.status === 'PRESENT') {
      // Check if a present record already exists to avoid overwriting audit data
      const existing = await this.staffAttendanceRepo.findPresentByAcademyDateAndStaffIds(
        actor.academyId,
        input.date,
        [input.staffUserId],
      );
      if (existing.length === 0) {
        const record = StaffAttendance.create({
          id: randomUUID(),
          academyId: actor.academyId,
          staffUserId: input.staffUserId,
          date: input.date,
          markedByUserId: input.actorUserId,
        });
        try {
          await this.staffAttendanceRepo.save(record);
          didChange = true;
        } catch (e) {
          // M1 fix: concurrent PRESENT marks (two owners on different
          // devices tapping the same staff member within milliseconds) both
          // pass the existence check and both attempt insert. The second
          // hits the unique index on (academyId, staffUserId, date) and
          // throws Mongo 11000. The desired state — staff is PRESENT — is
          // already achieved by the other call. Treat as idempotent success
          // instead of letting the bare error surface as 500.
          if ((e as { code?: number })?.code !== 11000) throw e;
        }
      }
    } else {
      // ABSENT: delete present record if exists (idempotent). deleteOne
      // returns deletedCount; if > 0, we actually changed state.
      const existing = await this.staffAttendanceRepo.findPresentByAcademyDateAndStaffIds(
        actor.academyId,
        input.date,
        [input.staffUserId],
      );
      if (existing.length > 0) {
        await this.staffAttendanceRepo.deleteByAcademyStaffDate(
          actor.academyId,
          input.staffUserId,
          input.date,
        );
        didChange = true;
      }
    }

    if (didChange) {
      await this.auditRecorder.record({
        academyId: actor.academyId,
        actorUserId: input.actorUserId,
        action: 'STAFF_ATTENDANCE_CHANGED',
        entityType: 'STAFF_ATTENDANCE',
        entityId: input.staffUserId,
        context: { staffUserId: input.staffUserId, date: input.date, status: input.status },
      });
    }

    return ok({
      staffUserId: input.staffUserId,
      date: input.date,
      status: input.status as StaffAttendanceViewStatus,
    });
  }
}
