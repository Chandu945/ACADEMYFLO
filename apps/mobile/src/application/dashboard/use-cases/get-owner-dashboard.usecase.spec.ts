import { getOwnerDashboardUseCase } from './get-owner-dashboard.usecase';
import type { DashboardApiPort } from './get-owner-dashboard.usecase';
import { ok, err } from '../../../domain/common/result';
import type { OwnerDashboardRange } from '../../../domain/dashboard/dashboard.types';

function makeValidPayload() {
  return {
    totalStudents: 45,
    pendingPaymentRequests: 3,
    totalCollected: 12000,
    totalPendingAmount: 5000,
    todayAbsentCount: 2,
    dueStudentsCount: 0,
    todayPresentCount: 43,
    totalExpenses: 0,
  };
}

function makeMockApi(result: ReturnType<typeof ok | typeof err>): DashboardApiPort {
  return { getOwnerDashboard: jest.fn().mockResolvedValue(result) };
}

describe('getOwnerDashboardUseCase', () => {
  it('maps valid preset response to domain KPIs', async () => {
    const payload = makeValidPayload();
    const api = makeMockApi(ok(payload));
    const range: OwnerDashboardRange = { mode: 'preset', preset: 'THIS_MONTH' };

    const result = await getOwnerDashboardUseCase({ dashboardApi: api }, range);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalActiveStudents).toBe(45);
      expect(result.value.pendingPaymentRequests).toBe(3);
      expect(result.value.collectedAmount).toBe(12000);
      expect(result.value.totalPendingAmount).toBe(5000);
      expect(result.value.todayAbsentCount).toBe(2);
    }
    expect(api.getOwnerDashboard).toHaveBeenCalledWith(range);
  });

  it('passes custom date range to API', async () => {
    const payload = makeValidPayload();
    const api = makeMockApi(ok(payload));
    const range: OwnerDashboardRange = { mode: 'custom', from: '2026-01-01', to: '2026-01-31' };

    const result = await getOwnerDashboardUseCase({ dashboardApi: api }, range);

    expect(result.ok).toBe(true);
    expect(api.getOwnerDashboard).toHaveBeenCalledWith(range);
  });

  it('returns domain error for invalid payload (negative count)', async () => {
    const payload = { ...makeValidPayload(), totalStudents: -1 };
    const api = makeMockApi(ok(payload));
    const range: OwnerDashboardRange = { mode: 'preset', preset: 'THIS_MONTH' };

    const result = await getOwnerDashboardUseCase({ dashboardApi: api }, range);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toBe('Unexpected server response');
    }
  });

  it('returns API error when API call fails', async () => {
    const api = makeMockApi(err({ code: 'NETWORK' as const, message: 'Network error' }));
    const range: OwnerDashboardRange = { mode: 'preset', preset: 'THIS_MONTH' };

    const result = await getOwnerDashboardUseCase({ dashboardApi: api }, range);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });
});
