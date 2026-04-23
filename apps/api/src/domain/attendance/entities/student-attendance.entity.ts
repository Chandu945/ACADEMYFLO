import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';

/**
 * Represents a PRESENT record for a student, in a specific batch, on a date.
 * Absence is implicit: no record for (academyId, studentId, batchId, date) =
 * the student was ABSENT from that batch's session that day.
 *
 * A student in two batches (morning + evening) has up to two records per day —
 * one per batch — letting us track each session independently.
 */
export interface StudentAttendanceProps {
  academyId: string;
  studentId: string;
  batchId: string;
  date: string; // YYYY-MM-DD (IST local date)
  markedByUserId: string;
  audit: AuditFields;
}

export class StudentAttendance extends Entity<StudentAttendanceProps> {
  private constructor(id: UniqueId, props: StudentAttendanceProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    studentId: string;
    batchId: string;
    date: string;
    markedByUserId: string;
  }): StudentAttendance {
    return new StudentAttendance(new UniqueId(params.id), {
      academyId: params.academyId,
      studentId: params.studentId,
      batchId: params.batchId,
      date: params.date,
      markedByUserId: params.markedByUserId,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: StudentAttendanceProps): StudentAttendance {
    return new StudentAttendance(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get batchId(): string {
    return this.props.batchId;
  }

  get date(): string {
    return this.props.date;
  }

  get markedByUserId(): string {
    return this.props.markedByUserId;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
