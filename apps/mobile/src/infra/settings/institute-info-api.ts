import type { InstituteInfo, UpdateInstituteInfoRequest } from '../../domain/settings/institute-info.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { ok, err } from '../../domain/common/result';
import { apiGet, apiPut, apiDelete, getAccessToken } from '../http/api-client';
import { mapHttpError } from '../http/error-mapper';
import { generateRequestId } from '../http/request-id';
import { policyFetch } from '../http/request-policy';
import { env } from '../env';

export function getInstituteInfo(): Promise<Result<InstituteInfo, AppError>> {
  return apiGet<InstituteInfo>('/api/v1/settings/institute-info');
}

export function updateInstituteInfo(
  req: UpdateInstituteInfoRequest,
): Promise<Result<InstituteInfo, AppError>> {
  return apiPut<InstituteInfo>('/api/v1/settings/institute-info', req);
}

export async function uploadInstituteImage(
  imageType: 'signature' | 'qrcode',
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<Result<{ url: string }, AppError>> {
  const url = `${env.API_BASE_URL}/api/v1/settings/institute-info/${imageType}`;

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const headers: Record<string, string> = {
    'X-Request-Id': generateRequestId(),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await policyFetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return err(mapHttpError(res.status, json));
    }

    const json = (await res.json()) as { data: { url: string } };
    return ok(json.data);
  } catch {
    return err({ code: 'NETWORK', message: 'Network error. Please check your connection.' });
  }
}

export function deleteInstituteImage(
  imageType: 'signature' | 'qrcode',
): Promise<Result<{ success: true }, AppError>> {
  return apiDelete<{ success: true }>(`/api/v1/settings/institute-info/${imageType}`);
}

export const instituteInfoApi = {
  getInstituteInfo,
  updateInstituteInfo,
  uploadInstituteImage,
  deleteInstituteImage,
};
