import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';

/**
 * Represents an ABSENT record for a student on a given date.
 * If no record exists for (academyId, studentId, date), the student is PRESENT.
 */
export interface StudentAttendanceProps {
  academyId: string;
  studentId: string;
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
    date: string;
    markedByUserId: string;
  }): StudentAttendance {
    return new StudentAttendance(new UniqueId(params.id), {
      academyId: params.academyId,
      studentId: params.studentId,
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
