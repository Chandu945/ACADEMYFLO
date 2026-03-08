import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';

export interface ParentStudentLinkProps {
  parentUserId: string;
  studentId: string;
  academyId: string;
  audit: AuditFields;
}

export class ParentStudentLink extends Entity<ParentStudentLinkProps> {
  private constructor(id: UniqueId, props: ParentStudentLinkProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    parentUserId: string;
    studentId: string;
    academyId: string;
  }): ParentStudentLink {
    return new ParentStudentLink(new UniqueId(params.id), {
      parentUserId: params.parentUserId,
      studentId: params.studentId,
      academyId: params.academyId,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: ParentStudentLinkProps): ParentStudentLink {
    return new ParentStudentLink(new UniqueId(id), props);
  }

  get parentUserId(): string {
    return this.props.parentUserId;
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
