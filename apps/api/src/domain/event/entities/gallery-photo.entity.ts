import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';

export interface GalleryPhotoProps {
  eventId: string;
  academyId: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  audit: AuditFields;
}

export class GalleryPhoto extends Entity<GalleryPhotoProps> {
  private constructor(id: UniqueId, props: GalleryPhotoProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    eventId: string;
    academyId: string;
    url: string;
    thumbnailUrl?: string | null;
    caption?: string | null;
    uploadedBy: string;
    uploadedByName?: string | null;
  }): GalleryPhoto {
    return new GalleryPhoto(new UniqueId(params.id), {
      eventId: params.eventId,
      academyId: params.academyId,
      url: params.url,
      thumbnailUrl: params.thumbnailUrl ?? null,
      caption: params.caption ?? null,
      uploadedBy: params.uploadedBy,
      uploadedByName: params.uploadedByName ?? null,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: GalleryPhotoProps): GalleryPhoto {
    return new GalleryPhoto(new UniqueId(id), props);
  }

  get eventId(): string { return this.props.eventId; }
  get academyId(): string { return this.props.academyId; }
  get url(): string { return this.props.url; }
  get thumbnailUrl(): string | null { return this.props.thumbnailUrl; }
  get caption(): string | null { return this.props.caption; }
  get uploadedBy(): string { return this.props.uploadedBy; }
  get uploadedByName(): string | null { return this.props.uploadedByName; }
  get audit(): AuditFields { return this.props.audit; }
}
