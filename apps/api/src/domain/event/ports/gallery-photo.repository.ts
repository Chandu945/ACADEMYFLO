import type { GalleryPhoto } from '../entities/gallery-photo.entity';

export const GALLERY_PHOTO_REPOSITORY = Symbol('GALLERY_PHOTO_REPOSITORY');

export interface GalleryPhotoRepository {
  save(photo: GalleryPhoto): Promise<void>;
  findById(id: string): Promise<GalleryPhoto | null>;
  listByEventId(eventId: string): Promise<GalleryPhoto[]>;
  delete(id: string): Promise<void>;
  deleteAllByEventId(eventId: string): Promise<void>;
  countByEventId(eventId: string): Promise<number>;
}
