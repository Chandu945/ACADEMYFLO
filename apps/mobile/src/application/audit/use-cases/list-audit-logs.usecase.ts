import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { AuditLogItem, AuditLogsQuery } from '../../../domain/audit/audit.types';
import {
  auditLogsResponseSchema,
  type AuditLogsApiResponse,
} from '../../../domain/audit/audit.schemas';

export type AuditApiPort = {
  listAuditLogs(query: AuditLogsQuery): Promise<Result<AuditLogsApiResponse, AppError>>;
};

export type ListAuditLogsDeps = {
  auditApi: AuditApiPort;
};

export type ListAuditLogsResult = {
  items: AuditLogItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function listAuditLogsUseCase(
  deps: ListAuditLogsDeps,
  query: AuditLogsQuery,
): Promise<Result<ListAuditLogsResult, AppError>> {
  const result = await deps.auditApi.listAuditLogs(query);

  if (!result.ok) {
    return result;
  }

  const parsed = auditLogsResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok({
    items: parsed.data.items,
    meta: parsed.data.meta,
  });
}
