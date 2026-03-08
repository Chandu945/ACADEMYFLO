import { getOwnerDashboard } from './dashboard-api';
import * as apiClient from '../http/api-client';
import { ok } from '../../domain/common/result';
import type { OwnerDashboardRange } from '../../domain/dashboard/dashboard.types';

jest.mock('../http/api-client', () => ({
  apiGet: jest.fn(),
}));

const mockApiGet = apiClient.apiGet as jest.Mock;

describe('dashboard-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds preset query param for THIS_MONTH', async () => {
    mockApiGet.mockResolvedValue(ok({}));
    const range: OwnerDashboardRange = { mode: 'preset', preset: 'THIS_MONTH' };

    await getOwnerDashboard(range);

    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/dashboard/owner?preset=THIS_MONTH');
  });

  it('builds from/to query params for custom date range', async () => {
    mockApiGet.mockResolvedValue(ok({}));
    const range: OwnerDashboardRange = { mode: 'custom', from: '2026-01-01', to: '2026-01-31' };

    await getOwnerDashboard(range);

    expect(mockApiGet).toHaveBeenCalledWith(
      '/api/v1/dashboard/owner?from=2026-01-01&to=2026-01-31',
    );
  });
});
