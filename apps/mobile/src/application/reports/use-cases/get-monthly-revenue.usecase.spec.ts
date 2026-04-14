import { getMonthlyRevenueUseCase } from './get-monthly-revenue.usecase';
import { ok, err } from '../../../domain/common/result';

const mockResponse = {
  totalAmount: 1500,
  transactionCount: 2,
  transactions: [
    {
      id: 'tx-1',
      studentId: 's1',
      monthKey: '2026-03',
      amount: 800,
      source: 'OWNER_DIRECT',
      receiptNumber: 'PC-000001',
      collectedByUserId: 'u1',
      approvedByUserId: 'u1',
      createdAt: '2026-03-04T10:00:00.000Z',
    },
    {
      id: 'tx-2',
      studentId: 's2',
      monthKey: '2026-03',
      amount: 700,
      source: 'STAFF_APPROVED',
      receiptNumber: 'PC-000002',
      collectedByUserId: 'u2',
      approvedByUserId: 'u1',
      createdAt: '2026-03-04T11:00:00.000Z',
    },
  ],
};

describe('getMonthlyRevenueUseCase', () => {
  it('maps successful API response correctly', async () => {
    const api = {
      getMonthlyRevenue: jest.fn().mockResolvedValue(ok(mockResponse)),
    };

    const result = await getMonthlyRevenueUseCase({ reportsApi: api }, '2026-03');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalAmount).toBe(1500);
      expect(result.value.transactionCount).toBe(2);
      expect(result.value.transactions).toHaveLength(2);
    }
    expect(api.getMonthlyRevenue).toHaveBeenCalledWith('2026-03');
  });

  it('propagates API errors', async () => {
    const api = {
      getMonthlyRevenue: jest
        .fn()
        .mockResolvedValue(err({ code: 'FORBIDDEN', message: 'Not allowed' })),
    };

    const result = await getMonthlyRevenueUseCase({ reportsApi: api }, '2026-03');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not allowed');
    }
  });

  it('returns error for invalid server response', async () => {
    const api = {
      getMonthlyRevenue: jest.fn().mockResolvedValue(ok({ bad: 'data' })),
    };

    const result = await getMonthlyRevenueUseCase({ reportsApi: api }, '2026-03');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Unexpected server response');
    }
  });
});
