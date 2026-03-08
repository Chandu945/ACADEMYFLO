import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';

export interface HolidayProps {
  academyId: string;
  date: string; // YYYY-MM-DD (IST local date)
  reason: string | null;
  declaredByUserId: string;
  audit: AuditFields;
}

export class Holiday extends Entity<HolidayProps> {
  private constructor(id: UniqueId, props: HolidayProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    date: string;
    reason?: string | null;
    declaredByUserId: string;
  }): Holiday {
    return new Holiday(new UniqueId(params.id), {
      academyId: params.academyId,
      date: params.date,
      reason: params.reason ?? null,
      declaredByUserId: params.declaredByUserId,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: HolidayProps): Holiday {
    return new Holiday(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get date(): string {
    return this.props.date;
  }

  get reason(): string | null {
    return this.props.reason;
  }

  get declaredByUserId(): string {
    return this.props.declaredByUserId;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
