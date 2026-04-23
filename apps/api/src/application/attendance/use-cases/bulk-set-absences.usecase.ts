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
  validateDateRange,
} from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { TransactionPort } from '../../common/transaction.port';
import { randomUUID } from 'crypto';

export interface BulkSetAbsencesInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
  date: string;
  /** Students in the batch who were ABSENT. Everyone else in the batch is PRESENT. */
  absentStudentIds: string[];
}

export interface BulkSetAbsencesOutput {
  batchId: string;
  date: string;
  absentCount: number;
}

export class BulkSetAbsencesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly transaction?: TransactionPort,
  ) {}

  async execute(input: BulkSetAbsencesInput): Promise<Result<BulkSetAbsencesOutput, AppError>> {
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

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }
    const academyId: string = actor.academyId;

    const batch = await this.batchRepo.findById(input.batchId);
    if (!batch) {
      return err(AttendanceErrors.batchNotFound(input.batchId));
    }
    if (batch.academyId !== academyId) {
      return err(AttendanceErrors.batchNotInAcademy());
    }

    // Check holiday
    const holiday = await this.holidayRepo.findByAcademyAndDate(academyId, input.date);
    if (holiday) {
      return err(AttendanceErrors.holidayDeclared());
    }

    // Validate every input student is enrolled in this batch (catches typos and
    // prevents marking absences for someone outside the batch's roster).
    const uniqueAbsent = [...new Set(input.absentStudentIds)];
    const enrollments = await this.studentBatchRepo.findByBatchId(input.batchId);
    const rosterIds = new Set(enrollments.map((e) => e.studentId));
    for (const sid of uniqueAbsent) {
      if (!rosterIds.has(sid)) {
        return err(AttendanceErrors.studentNotInBatch());
      }
    }

    // Confirm the absent students still exist + are active in the academy.
    const students = await this.studentRepo.findByIds(uniqueAbsent);
    const studentMap = new Map(students.map((s) => [s.id.toString(), s]));
    for (const studentId of uniqueAbsent) {
      const student = studentMap.get(studentId);
      if (!student || student.isDeleted()) {
        return err(AttendanceErrors.studentNotFound(studentId));
      }
      if (student.academyId !== academyId) {
        return err(AttendanceErrors.studentNotInAcademy());
      }
      if (student.status !== 'ACTIVE') {
        return err(AttendanceErrors.studentNotActive(studentId));
      }
    }

    // Active students in the batch should be PRESENT; everyone else (in absent
    // set or inactive) should not have a record. We filter to ACTIVE because
    // attendance for inactive students isn't tracked.
    const allRosterStudents = await this.studentRepo.findByIds([...rosterIds]);
    const activeRosterIds = allRosterStudents
      .filter((s) => !s.isDeleted() && s.status === 'ACTIVE')
      .map((s) => s.id.toString());
    const absentSet = new Set(uniqueAbsent);
    const shouldBePresentIds = activeRosterIds.filter((id) => !absentSet.has(id));

    // Records currently saved for this batch on this date.
    const currentPresent = await this.attendanceRepo.findPresentByAcademyBatchAndDate(
      academyId,
      input.batchId,
      input.date,
    );
    const currentPresentSet = new Set(currentPresent.map((r) => r.studentId));
    const targetPresentSet = new Set(shouldBePresentIds);

    // Wrap delete+create in a transaction so a mid-flight failure doesn't leave
    // the batch in a partial state.
    const bulkOps = async () => {
      // Delete present records for students no longer present.
      for (const record of currentPresent) {
        if (!targetPresentSet.has(record.studentId)) {
          await this.attendanceRepo.deleteByAcademyStudentBatchDate(
            academyId,
            record.studentId,
            input.batchId,
            input.date,
          );
        }
      }

      // Insert missing present records.
      for (const studentId of shouldBePresentIds) {
        if (!currentPresentSet.has(studentId)) {
          const record = StudentAttendance.create({
            id: randomUUID(),
            academyId,
            studentId,
            batchId: input.batchId,
            date: input.date,
            markedByUserId: input.actorUserId,
          });
          await this.attendanceRepo.save(record);
        }
      }
    };

    if (this.transaction) {
      await this.transaction.run(bulkOps);
    } else {
      await bulkOps();
    }

    await this.auditRecorder.record({
      academyId,
      actorUserId: input.actorUserId,
      action: 'STUDENT_ATTENDANCE_EDITED',
      entityType: 'STUDENT_ATTENDANCE',
      entityId: input.batchId,
      context: {
        batchId: input.batchId,
        date: input.date,
        absentCount: String(uniqueAbsent.length),
      },
    });

    return ok({
      batchId: input.batchId,
      date: input.date,
      absentCount: uniqueAbsent.length,
    });
  }
}
