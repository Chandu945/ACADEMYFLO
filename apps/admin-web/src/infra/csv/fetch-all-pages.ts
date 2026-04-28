import 'server-only';

import { apiGet } from '@/infra/http/api-client';

interface PaginatedResponse<T> {
  items?: T[];
  total?: number;
  meta?: { totalPages?: number; totalItems?: number };
}

interface FetchAllOpts {
  accessToken: string;
  /** API path (without query). e.g. /api/v1/admin/academies */
  basePath: string;
  /** Query params common to all pages (status, search, etc.) */
  query: URLSearchParams;
  /** Page size per request — usually 200 (the API max). */
  pageSize?: number;
  /** Hard cap on total rows to fetch. Prevents accidental 100k exports.
   *  Default 10000. */
  maxRows?: number;
}

/**
 * Page through a paginated admin endpoint and return all items.
 *
 * Stops when:
 * - we've fetched as many items as `meta.totalItems` (or `total`) reports, or
 * - we've hit `maxRows`, or
 * - a page returns fewer items than `pageSize` (defensive — implies "no more").
 *
 * Returns either { ok: true, items } or { ok: false, error: message } so
 * callers can map to a 4xx/5xx without try/catch noise.
 */
export async function fetchAllPages<T>(
  opts: FetchAllOpts,
): Promise<{ ok: true; items: T[]; truncated: boolean } | { ok: false; status: number; error: string }> {
  const pageSize = opts.pageSize ?? 200;
  const maxRows = opts.maxRows ?? 10_000;
  const items: T[] = [];
  let truncated = false;

  for (let page = 1; ; page++) {
    const params = new URLSearchParams(opts.query);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    const result = await apiGet<PaginatedResponse<T>>(
      `${opts.basePath}?${params.toString()}`,
      { accessToken: opts.accessToken },
    );

    if (!result.ok) {
      return {
        ok: false,
        status: result.error.code === 'UNAUTHORIZED' ? 401 : 500,
        error: result.error.message,
      };
    }

    const pageItems = result.data.items ?? [];
    const total =
      result.data.meta?.totalItems ??
      result.data.total ??
      (pageItems.length < pageSize ? items.length + pageItems.length : null);

    items.push(...pageItems);

    if (items.length >= maxRows) {
      truncated = true;
      items.length = maxRows;
      break;
    }

    if (pageItems.length === 0 || pageItems.length < pageSize) break;
    if (typeof total === 'number' && items.length >= total) break;
  }

  return { ok: true, items, truncated };
}
