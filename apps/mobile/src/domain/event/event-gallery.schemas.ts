import { z } from 'zod';

export const galleryPhotoSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  caption: z.string().nullable(),
  uploadedBy: z.string(),
  uploadedByName: z.string().nullable(),
  createdAt: z.string(),
});

export const galleryPhotoListSchema = z.array(galleryPhotoSchema);

export const galleryDeleteResponseSchema = z.object({
  deleted: z.boolean(),
});
