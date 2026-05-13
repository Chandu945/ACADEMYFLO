import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';
import type { StudentAttendanceStatus } from '@academyflo/contracts';

/**
 * Represents a PRESENT or ABSENT record for a student in a specific batch on
 * a date. The status field is explicit (was implicit-via-deletion in earlier
 * versions; see schema docstring for migration notes). "No record at all"
 * still means "unmarked" — the dashboard treats unmarked + scheduled-today
 * as present until someone explicitly marks them ABSENT.
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
  status: StudentAttendanceStatus;
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
    /** Defaults to PRESENT so existing callers (legacy create-PRESENT-record
     *  path) keep working without touching every call-site. The new mark
     *  use-case passes ABSENT explicitly when recording an absence. */
    status?: StudentAttendanceStatus;
  }): StudentAttendance {
    return new StudentAttendance(new UniqueId(params.id), {
      academyId: params.academyId,
      studentId: params.studentId,
      batchId: params.batchId,
      date: params.date,
      markedByUserId: params.markedByUserId,
      status: params.status ?? 'PRESENT',
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

  get status(): StudentAttendanceStatus {
    return this.props.status;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
