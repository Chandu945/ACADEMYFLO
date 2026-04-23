import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields, updateAuditFields } from '@shared/kernel';

export interface AcademyReviewProps {
  academyId: string;
  parentUserId: string;
  rating: number; // 1..5
  comment: string | null;
  audit: AuditFields;
}

export class AcademyReview extends Entity<AcademyReviewProps> {
  private constructor(id: UniqueId, props: AcademyReviewProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    parentUserId: string;
    rating: number;
    comment?: string | null;
  }): AcademyReview {
    return new AcademyReview(new UniqueId(params.id), {
      academyId: params.academyId,
      parentUserId: params.parentUserId,
      rating: params.rating,
      comment: params.comment ?? null,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: AcademyReviewProps): AcademyReview {
    return new AcademyReview(new UniqueId(id), props);
  }

  updateContent(params: { rating: number; comment: string | null }): void {
    this.props.rating = params.rating;
    this.props.comment = params.comment;
    this.props.audit = updateAuditFields(this.props.audit);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get parentUserId(): string {
    return this.props.parentUserId;
  }

  get rating(): number {
    return this.props.rating;
  }

  get comment(): string | null {
    return this.props.comment;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
