import { listAuditLogs } from './audit-logs.service';
import { serializeQuery, parseQuery, validateFromTo } from './query';

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const validPayload = {
  items: [
    {
      id: 'log1',
      occurredAt: '2026-03-01T10:00:00.000Z',
      actor: { userId: 'u1', role: 'OWNER', name: null },
      actionType: 'STUDENT_CREATED',
      entity: { type: 'STUDENT', id: 's1' },
      context: { month: '2026-03' },
    },
  ],
  meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
};

describe('serializeQuery', () => {
  it('produces correct URLSearchParams with all fields', () => {
    const params = serializeQuery({
      page: 2,
      pageSize: 100,
      from: '2026-02-01',
      to: '2026-03-01',
      actionType: 'STUDENT_CREATED',
    });
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('100');
    expect(params.get('from')).toBe('2026-02-01');
    expect(params.get('to')).toBe('2026-03-01');
    expect(params.get('actionType')).toBe('STUDENT_CREATED');
  });

  it('omits optional fields when not set', () => {
    const params = serializeQuery({ page: 1, pageSize: 50 });
    expect(params.has('from')).toBe(false);
    expect(params.has('to')).toBe(false);
    expect(params.has('actionType')).toBe(false);
  });
});

describe('parseQuery', () => {
  it('parses valid params', () => {
    const sp = new URLSearchParams(
      'page=3&pageSize=100&from=2026-02-01&to=2026-03-01&actionType=STUDENT_CREATED',
    );
    const q = parseQuery(sp);
    expect(q.page).toBe(3);
    expect(q.pageSize).toBe(100);
    expect(q.from).toBe('2026-02-01');
    expect(q.to).toBe('2026-03-01');
    expect(q.actionType).toBe('STUDENT_CREATED');
  });

  it('defaults page=1 and pageSize=50', () => {
    const q = parseQuery(new URLSearchParams());
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(50);
    expect(q.from).toBeDefined();
    expect(q.to).toBeDefined();
  });

  it('clamps pageSize to 1-100', () => {
    expect(parseQuery(new URLSearchParams('pageSize=0')).pageSize).toBe(1);
    expect(parseQuery(new URLSearchParams('pageSize=200')).pageSize).toBe(100);
  });
});

describe('validateFromTo', () => {
  it('returns true when from <= to', () => {
    expect(validateFromTo('2026-01-01', '2026-01-31')).toBe(true);
  });

  it('returns true when from equals to', () => {
    expect(validateFromTo('2026-01-15', '2026-01-15')).toBe(true);
  });

  it('returns false when from > to', () => {
    expect(validateFromTo('2026-02-01', '2026-01-01')).toBe(false);
  });

  it('returns true when only one is provided', () => {
    expect(validateFromTo('2026-01-01', undefined)).toBe(true);
    expect(validateFromTo(undefined, '2026-01-01')).toBe(true);
  });
});

describe('listAuditLogs', () => {
  it('maps valid payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: validPayload }),
    } as Response);

    const result = await listAuditLogs('a1', { page: 1, pageSize: 50 }, 'tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]!.actionType).toBe('STUDENT_CREATED');
      expect(result.data.items[0]!.actor.userId).toBe('u1');
      expect(result.data.meta.totalItems).toBe(1);
    }
  });

  it('rejects invalid payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { bad: true } }),
    } as Response);

    const result = await listAuditLogs('a1', { page: 1, pageSize: 50 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('returns UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    const result = await listAuditLogs('a1', { page: 1, pageSize: 50 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('returns NOT_FOUND on 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Academy not found' }),
    } as Response);

    const result = await listAuditLogs('nonexistent', { page: 1, pageSize: 50 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns NETWORK on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await listAuditLogs('a1', { page: 1, pageSize: 50 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK');
  });
});
