import { Platform } from 'react-native';
import type { GalleryPhoto } from '../../domain/event/event-gallery.types';
import {
  galleryPhotoSchema,
  galleryPhotoListSchema,
  galleryDeleteResponseSchema,
} from '../../domain/event/event-gallery.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { ok, err } from '../../domain/common/result';
import { apiGet, apiDelete, getAccessToken, tryRefresh } from '../http/api-client';
import { mapHttpError } from '../http/error-mapper';
import { generateRequestId } from '../http/request-id';
import { env } from '../env';
import type { ZodSchema } from 'zod';

function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[galleryApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function listGalleryPhotos(
  eventId: string,
): Promise<Result<GalleryPhoto[], AppError>> {
  const result = await apiGet<unknown>(`/api/v1/events/${encodeURIComponent(eventId)}/gallery`);
  return validateResponse(
    galleryPhotoListSchema as unknown as ZodSchema<GalleryPhoto[]>,
    result,
    'listGalleryPhotos',
  );
}

async function doGalleryUpload(
  eventId: string,
  formData: FormData,
  token: string | null,
): Promise<Response> {
  return fetch(
    `${env.API_BASE_URL}/api/v1/events/${encodeURIComponent(eventId)}/gallery`,
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

    const json = (await res.json()) as { data?: unknown } | null;
    // Server returns either { data: GalleryPhoto } or the photo at root.
    // Validate either shape so we don't silently accept malformed responses.
    const candidate = json && typeof json === 'object' && 'data' in json ? json.data : json;
    const parsed = galleryPhotoSchema.safeParse(candidate);
    if (!parsed.success) {
      if (__DEV__) {
        console.error('[galleryApi] uploadGalleryPhoto schema mismatch:', parsed.error.issues);
      }
      return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
    }
    return ok(parsed.data);
  } catch {
    return err({
      code: 'NETWORK',
      message: 'Network error. Please check your connection.',
    });
  }
}

export async function deleteGalleryPhoto(
  eventId: string,
  photoId: string,
): Promise<Result<{ deleted: boolean }, AppError>> {
  const result = await apiDelete<unknown>(
    `/api/v1/events/${encodeURIComponent(eventId)}/gallery/${encodeURIComponent(photoId)}`,
  );
  return validateResponse(galleryDeleteResponseSchema, result, 'deleteGalleryPhoto');
}
