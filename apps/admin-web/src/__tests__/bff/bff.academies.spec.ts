/**
 * BFF academies service integration tests — verifies academy
 * list and detail services handle API responses correctly.
 */
import { listAcademies } from '@/application/academies/academies.service';
import { getDetail } from '@/application/academy-detail/academy-detail.service';

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('BFF Academies — listAcademies', () => {
  it('returns paginated academy list on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              academyId: 'a1',
              academyName: 'Academy One',
              ownerName: 'Owner',
              ownerEmail: 'owner@test.com',
              status: 'TRIAL',
              tierKey: null,
              createdAt: '2024-01-01',
            },
          ],
          meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
        },
      }),
    } as Response);

    const result = await listAcademies({ page: 1, pageSize: 10 }, 'tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]!.academyName).toBe('Academy One');
    }
  });

  it('returns error on 401 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    const result = await listAcademies({ page: 1, pageSize: 10 }, 'bad-tok');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });
});

describe('BFF Academies — getDetail', () => {
  it('returns academy detail on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          academyId: 'a1',
          academyName: 'Test Academy',
          loginDisabled: false,
          ownerUserId: 'u1',
          ownerName: 'Owner',
          ownerEmail: 'owner@test.com',
          ownerPhone: '+919876543210',
          subscription: {
            id: 'sub1',
            status: 'TRIAL',
            tierKey: null,
            trialStartAt: null,
            trialEndAt: '2026-04-01',
            paidStartAt: null,
            paidEndAt: null,
            manualNotes: null,
            paymentReference: null,
          },
          studentCount: 10,
          staffCount: 2,
          revenueThisMonth: 5000,
        },
      }),
    } as Response);

    const result = await getDetail('a1', 'tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.academyName).toBe('Test Academy');
    }
  });

  it('returns error on 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    } as Response);

    const result = await getDetail('nonexistent', 'tok');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
