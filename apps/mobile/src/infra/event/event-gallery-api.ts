import { Platform } from 'react-native';
import type { GalleryPhoto } from '../../domain/event/event-gallery.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { ok, err } from '../../domain/common/result';
import { apiGet, apiDelete, getAccessToken, tryRefresh } from '../http/api-client';
import { mapHttpError } from '../http/error-mapper';
import { generateRequestId } from '../http/request-id';
import { env } from '../env';

export function listGalleryPhotos(
  eventId: string,
): Promise<Result<GalleryPhoto[], AppError>> {
  return apiGet<GalleryPhoto[]>(`/api/v1/events/${eventId}/gallery`);
}

async function doGalleryUpload(
  eventId: string,
  formData: FormData,
  token: string | null,
): Promise<Response> {
  return fetch(
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
}

export async function uploadGalleryPhoto(
  eventId: string,
  uri: string,
  fileName: string,
  mimeType: string,
  caption?: string,
): Promise<Result<GalleryPhoto, AppError>> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('file', new File([blob], fileName, { type: mimeType }));
  } else {
    formData.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }
  if (caption) {
    formData.append('caption', caption);
  }

  try {
    let res = await doGalleryUpload(eventId, formData, getAccessToken());

    if (res.status === 401) {
      const newToken = await tryRefresh();
      if (newToken) {
        res = await doGalleryUpload(eventId, formData, newToken);
      } else {
        return err({ code: 'UNAUTHORIZED', message: 'Session expired' });
      }
    }

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return err(mapHttpError(res.status, json));
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
