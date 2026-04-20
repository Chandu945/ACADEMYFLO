import 'server-only';

import { AppError } from '@/domain/common/errors';
import { serverEnv } from '@/infra/env';
import { mapApiError } from '@/infra/http/error-mapper';
import { generateRequestId } from '@/infra/http/request-id';
import { assertSafeApiUrl } from '@/infra/http/ssrf-guard';
import { safeFetchGet, safeFetchMutate } from '@/infra/http/fetch-policy';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

type RequestOpts = {
  accessToken?: string;
};

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOpts,
): Promise<ApiResult<T>> {
  const { API_BASE_URL } = serverEnv();
  assertSafeApiUrl(API_BASE_URL, path);
  const url = `${API_BASE_URL}${path}`;
  const requestId = generateRequestId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
  };
  if (opts?.accessToken) {
    headers['Authorization'] = `Bearer ${opts.accessToken}`;
  }

  const fetchFn = method === 'GET' ? safeFetchGet : safeFetchMutate;

  let res: Response;
  try {
    res = await fetchFn(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: AppError.network() };
  }

  const retryAfter = res.headers.get('retry-after');

  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    if (!res.ok) {
      return { ok: false, error: mapApiError(res.status, undefined, retryAfter) };
    }
    // 204 No Content or empty body — return empty object
    return { ok: true, data: {} as T };
  }

  if (!res.ok) {
    return { ok: false, error: mapApiError(res.status, json, retryAfter) };
  }

  const data = (json['data'] ?? json) as T;
  return { ok: true, data };
}

export function apiGet<T>(path: string, opts?: RequestOpts): Promise<ApiResult<T>> {
  return apiFetch<T>('GET', path, undefined, opts);
}

export function apiPost<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<ApiResult<T>> {
  return apiFetch<T>('POST', path, body, opts);
}

export function apiPut<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<ApiResult<T>> {
  return apiFetch<T>('PUT', path, body, opts);
}

export function apiPatch<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<ApiResult<T>> {
  return apiFetch<T>('PATCH', path, body, opts);
}

export function apiDelete<T>(path: string, opts?: RequestOpts): Promise<ApiResult<T>> {
  return apiFetch<T>('DELETE', path, undefined, opts);
}
