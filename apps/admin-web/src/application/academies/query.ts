import type { AcademiesQuery } from '@/domain/admin/academies';

const MAX_SEARCH_LENGTH = 80;

export function serializeQuery(query: AcademiesQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  if (query.tier) params.set('tier', query.tier);
  if (query.search) {
    const trimmed = query.search.trim().slice(0, MAX_SEARCH_LENGTH);
    if (trimmed) params.set('search', trimmed);
  }
  return params;
}

export function parseQuery(searchParams: URLSearchParams): AcademiesQuery {
  const rawPage = parseInt(searchParams.get('page') ?? '', 10);
  const rawPageSize = parseInt(searchParams.get('pageSize') ?? '', 10);

  return {
    page: Math.max(1, Number.isFinite(rawPage) ? rawPage : 1),
    pageSize: Math.min(100, Math.max(1, Number.isFinite(rawPageSize) ? rawPageSize : 20)),
    status: (searchParams.get('status') as AcademiesQuery['status']) || undefined,
    tier: (searchParams.get('tier') as AcademiesQuery['tier']) || undefined,
    search: searchParams.get('search')?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined,
  };
}

export const DEFAULT_QUERY: AcademiesQuery = {
  page: 1,
  pageSize: 20,
};
