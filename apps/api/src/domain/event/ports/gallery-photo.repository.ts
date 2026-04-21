import type { GalleryPhoto } from '../entities/gallery-photo.entity';

export const GALLERY_PHOTO_REPOSITORY = Symbol('GALLERY_PHOTO_REPOSITORY');

export interface GalleryPhotoRepository {
  save(photo: GalleryPhoto): Promise<void>;
  findById(id: string): Promise<GalleryPhoto | null>;
  listByEventId(eventId: string): Promise<GalleryPhoto[]>;
  delete(id: string): Promise<void>;
  /**
   * Cascade-delete all photos for an event. Scoped by academyId so a caller
   * bug that passes an eventId from another tenant cannot wipe that tenant's
   * gallery. Same defense-in-depth as EventRepository.delete.
   */
  deleteAllByEventId(eventId: string, academyId: string): Promise<void>;
  countByEventId(eventId: string): Promise<number>;
}
