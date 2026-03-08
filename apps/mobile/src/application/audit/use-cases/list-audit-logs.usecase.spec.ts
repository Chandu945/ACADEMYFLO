import { listAuditLogsUseCase } from './list-audit-logs.usecase';
import { ok, err } from '../../../domain/common/result';
import type { AuditLogsApiResponse } from '../../../domain/audit/audit.schemas';
import type { AppError } from '../../../domain/common/errors';

function makeResponse(): AuditLogsApiResponse {
  return {
    items: [
      {
        id: 'log-1',
        academyId: 'academy-1',
        actorUserId: 'user-1',
        actorName: 'Test User',
        action: 'STUDENT_CREATED',
        entityType: 'STUDENT',
        entityId: 'student-1',
        context: { studentName: 'John Doe' },
        createdAt: '2026-03-01T10:00:00Z',
      },
    ],
    meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
  };
}

function makeApi(
  response: { ok: true; value: AuditLogsApiResponse } | { ok: false; error: AppError },
) {
  return { auditApi: { listAuditLogs: jest.fn().mockResolvedValue(response) } };
}

describe('listAuditLogsUseCase', () => {
  it('should return parsed items and meta on success', async () => {
    const deps = makeApi(ok(makeResponse()));

    const result = await listAuditLogsUseCase(deps, { page: 1, pageSize: 50 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0].action).toBe('STUDENT_CREATED');
      expect(result.value.meta.totalItems).toBe(1);
    }
  });

  it('should pass query params to API', async () => {
    const deps = makeApi(ok(makeResponse()));
    const query = {
      page: 2,
      pageSize: 20,
      from: '2026-01-01',
      to: '2026-01-31',
      action: 'STUDENT_UPDATED' as const,
    };

    await listAuditLogsUseCase(deps, query);

    expect(deps.auditApi.listAuditLogs).toHaveBeenCalledWith(query);
  });

  it('should propagate API error', async () => {
    const deps = makeApi(err({ code: 'FORBIDDEN', message: 'Only owners can view audit logs' }));

    const result = await listAuditLogsUseCase(deps, { page: 1, pageSize: 50 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should return UNKNOWN for invalid server response', async () => {
    const invalid = { items: [{ id: 'x' }], meta: { page: 1 } } as unknown as AuditLogsApiResponse;
    const deps = makeApi(ok(invalid));

    const result = await listAuditLogsUseCase(deps, { page: 1, pageSize: 50 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN');
    }
  });
});
