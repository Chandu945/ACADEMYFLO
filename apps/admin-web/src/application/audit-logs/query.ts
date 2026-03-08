import type { AuditLogsQuery } from '@/domain/admin/audit-logs';

function formatLocalDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const to = formatLocalDate(now);
  const from = formatLocalDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  return { from, to };
}

export function serializeQuery(query: AuditLogsQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.actionType) params.set('actionType', query.actionType);
  return params;
}

export function parseQuery(searchParams: URLSearchParams): AuditLogsQuery {
  const rawPage = parseInt(searchParams.get('page') ?? '', 10);
  const rawPageSize = parseInt(searchParams.get('pageSize') ?? '', 10);
  const defaults = getDefaultDateRange();

  const from = searchParams.get('from') || defaults.from;
  const to = searchParams.get('to') || defaults.to;

  return {
    page: Math.max(1, Number.isFinite(rawPage) ? rawPage : 1),
    pageSize: Math.min(100, Math.max(1, Number.isFinite(rawPageSize) ? rawPageSize : 50)),
    from: /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defaults.from,
    to: /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : defaults.to,
    actionType: (searchParams.get('actionType') as AuditLogsQuery['actionType']) || undefined,
  };
}

export function validateFromTo(from?: string, to?: string): boolean {
  if (from && to) return from <= to;
  return true;
}

export const DEFAULT_QUERY: AuditLogsQuery = {
  page: 1,
  pageSize: 50,
  ...getDefaultDateRange(),
};
