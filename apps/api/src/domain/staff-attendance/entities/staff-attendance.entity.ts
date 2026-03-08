import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';

/**
 * Represents an ABSENT record for a staff member on a given date.
 * If no record exists for (academyId, staffUserId, date), the staff is PRESENT.
 */
export interface StaffAttendanceProps {
  academyId: string;
  staffUserId: string;
  date: string; // YYYY-MM-DD (IST local date)
  markedByUserId: string;
  audit: AuditFields;
}

export class StaffAttendance extends Entity<StaffAttendanceProps> {
  private constructor(id: UniqueId, props: StaffAttendanceProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    staffUserId: string;
    date: string;
    markedByUserId: string;
  }): StaffAttendance {
    return new StaffAttendance(new UniqueId(params.id), {
      academyId: params.academyId,
      staffUserId: params.staffUserId,
      date: params.date,
      markedByUserId: params.markedByUserId,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: StaffAttendanceProps): StaffAttendance {
    return new StaffAttendance(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get staffUserId(): string {
    return this.props.staffUserId;
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
