import type { GalleryPhoto } from '../../domain/event/event-gallery.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { ok, err } from '../../domain/common/result';
import { apiGet, apiDelete, getAccessToken } from '../http/api-client';
import { generateRequestId } from '../http/request-id';
import { env } from '../env';

export function listGalleryPhotos(
  eventId: string,
): Promise<Result<GalleryPhoto[], AppError>> {
  return apiGet<GalleryPhoto[]>(`/api/v1/events/${eventId}/gallery`);
}

export async function uploadGalleryPhoto(
  eventId: string,
  uri: string,
  fileName: string,
  mimeType: string,
  caption?: string,
): Promise<Result<GalleryPhoto, AppError>> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  if (caption) {
    formData.append('caption', caption);
  }

  const token = getAccessToken();
  try {
    const res = await fetch(
      `${env.API_BASE_URL}/api/v1/events/${eventId}/gallery`,
      {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Request-Id': generateRequestId(),
        },
        body: formData,
      },
    );

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return err({
        code: 'UNKNOWN',
        message: json?.error || 'Upload failed',
      });
    }

    const json = (await res.json()) as { data: GalleryPhoto };
    return ok(json.data);
  } catch {
    return err({
      code: 'NETWORK',
      message: 'Network error. Please check your connection.',
    });
  }
}

export function deleteGalleryPhoto(
  eventId: string,
  photoId: string,
): Promise<Result<{ deleted: boolean }, AppError>> {
  return apiDelete<{ deleted: boolean }>(
    `/api/v1/events/${eventId}/gallery/${photoId}`,
  );
}
