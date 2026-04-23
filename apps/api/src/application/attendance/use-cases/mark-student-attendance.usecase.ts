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

    if (student.status !== 'ACTIVE') {
      return err(AttendanceErrors.studentNotActive(input.studentId));
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

    if (input.status === 'PRESENT') {
      // Upsert present record (idempotent)
      const existing = await this.attendanceRepo.findByAcademyStudentBatchDate(
        actor.academyId,
        input.studentId,
        input.batchId,
        input.date,
      );
      if (!existing) {
        const record = StudentAttendance.create({
          id: randomUUID(),
          academyId: actor.academyId,
          studentId: input.studentId,
          batchId: input.batchId,
          date: input.date,
          markedByUserId: input.actorUserId,
        });
        await this.attendanceRepo.save(record);
      }
    } else {
      // ABSENT: delete present record if exists (idempotent)
      await this.attendanceRepo.deleteByAcademyStudentBatchDate(
        actor.academyId,
        input.studentId,
        input.batchId,
        input.date,
      );
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

    return ok({
      studentId: input.studentId,
      batchId: input.batchId,
      date: input.date,
      status: input.status as StudentAttendanceStatus,
    });
  }
}
