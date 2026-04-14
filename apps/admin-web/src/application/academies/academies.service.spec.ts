import { listAcademies } from './academies.service';
import { serializeQuery, parseQuery } from './query';

const DEFAULT_QUERY = { page: 1, pageSize: 20 } as const;

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const validPayload = {
  items: [
    {
      academyId: 'a1',
      academyName: 'Test Academy',
      ownerName: 'John Doe',
      ownerEmail: 'john@test.com',
      status: 'TRIAL',
      tierKey: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

describe('serializeQuery', () => {
  it('produces correct URLSearchParams with defaults', () => {
    const params = serializeQuery(DEFAULT_QUERY);
    expect(params.get('page')).toBe('1');
    expect(params.get('pageSize')).toBe('20');
    expect(params.has('status')).toBe(false);
    expect(params.has('tier')).toBe(false);
    expect(params.has('search')).toBe(false);
  });

  it('includes status, tier, and search when provided', () => {
    const params = serializeQuery({
      page: 2,
      pageSize: 50,
      status: 'TRIAL',
      tier: 'TIER_0_50',
      search: 'test academy',
    });
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('50');
    expect(params.get('status')).toBe('TRIAL');
    expect(params.get('tier')).toBe('TIER_0_50');
    expect(params.get('search')).toBe('test academy');
  });

  it('trims search and enforces max length', () => {
    const longSearch = 'a'.repeat(100);
    const params = serializeQuery({ ...DEFAULT_QUERY, search: `  ${longSearch}  ` });
    expect(params.get('search')!.length).toBe(80);
  });

  it('omits empty search after trim', () => {
    const params = serializeQuery({ ...DEFAULT_QUERY, search: '   ' });
    expect(params.has('search')).toBe(false);
  });
});

describe('parseQuery', () => {
  it('parses valid params including tier', () => {
    const sp = new URLSearchParams(
      'page=3&pageSize=50&status=BLOCKED&tier=TIER_51_100&search=test',
    );
    const q = parseQuery(sp);
    expect(q.page).toBe(3);
    expect(q.pageSize).toBe(50);
    expect(q.status).toBe('BLOCKED');
    expect(q.tier).toBe('TIER_51_100');
    expect(q.search).toBe('test');
  });

  it('defaults page to 1 and pageSize to 20', () => {
    const q = parseQuery(new URLSearchParams());
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
    expect(q.status).toBeUndefined();
    expect(q.tier).toBeUndefined();
    expect(q.search).toBeUndefined();
  });

  it('clamps pageSize to 1-100', () => {
    expect(parseQuery(new URLSearchParams('pageSize=0')).pageSize).toBe(1);
    expect(parseQuery(new URLSearchParams('pageSize=200')).pageSize).toBe(100);
  });
});

describe('listAcademies', () => {
  it('maps valid backend payload with optional fields', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: validPayload }),
    } as Response);

    const result = await listAcademies(DEFAULT_QUERY, 'tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(1);
      const item = result.data.items[0]!;
      expect(item.academyName).toBe('Test Academy');
      expect(item.ownerPhone).toBeNull();
      expect(item.activeStudentCount).toBeNull();
      expect(item.staffCount).toBeNull();
      expect(item.thisMonthRevenueTotal).toBeNull();
      expect(result.data.meta.totalItems).toBe(1);
    }
  });

  it('maps backend payload with populated optional fields', async () => {
    const extendedPayload = {
      items: [
        {
          ...validPayload.items[0],
          ownerPhone: '+919876543210',
          activeStudentCount: 25,
          staffCount: 3,
          thisMonthRevenueTotal: 5000,
        },
      ],
      meta: validPayload.meta,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: extendedPayload }),
    } as Response);

    const result = await listAcademies(DEFAULT_QUERY, 'tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const item = result.data.items[0]!;
      expect(item.ownerPhone).toBe('+919876543210');
      expect(item.activeStudentCount).toBe(25);
      expect(item.staffCount).toBe(3);
      expect(item.thisMonthRevenueTotal).toBe(5000);
    }
  });

  it('passes access token in Authorization header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: validPayload }),
    } as Response);

    await listAcademies(DEFAULT_QUERY, 'my-token');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/academies?'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
      }),
    );
  });

  it('rejects invalid payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { bad: true } }),
    } as Response);

    const result = await listAcademies(DEFAULT_QUERY);
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

    const result = await listAcademies(DEFAULT_QUERY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns NETWORK on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await listAcademies(DEFAULT_QUERY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });
});
