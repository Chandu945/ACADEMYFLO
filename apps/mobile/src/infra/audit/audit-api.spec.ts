import { listAuditLogs } from './audit-api';
import * as apiClient from '../http/api-client';
import { ok } from '../../domain/common/result';

jest.mock('../http/api-client', () => ({
  apiGet: jest.fn(),
}));

const mockApiGet = apiClient.apiGet as jest.Mock;

describe('audit-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds query with page and pageSize only', async () => {
    mockApiGet.mockResolvedValue(ok({}));

    await listAuditLogs({ page: 1, pageSize: 50 });

    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/audit-logs?page=1&pageSize=50');
  });

  it('includes from and to when provided', async () => {
    mockApiGet.mockResolvedValue(ok({}));

    await listAuditLogs({ page: 1, pageSize: 50, from: '2026-01-01', to: '2026-01-31' });

    expect(mockApiGet).toHaveBeenCalledWith(
      '/api/v1/audit-logs?page=1&pageSize=50&from=2026-01-01&to=2026-01-31',
    );
  });

  it('includes action filter when provided', async () => {
    mockApiGet.mockResolvedValue(ok({}));

    await listAuditLogs({ page: 1, pageSize: 50, action: 'STUDENT_CREATED' });

    expect(mockApiGet).toHaveBeenCalledWith(
      '/api/v1/audit-logs?page=1&pageSize=50&action=STUDENT_CREATED',
    );
  });

  it('includes all filters together', async () => {
    mockApiGet.mockResolvedValue(ok({}));

    await listAuditLogs({
      page: 2,
      pageSize: 20,
      from: '2026-03-01',
      to: '2026-03-04',
      action: 'PAYMENT_REQUEST_CREATED',
    });

    expect(mockApiGet).toHaveBeenCalledWith(
      '/api/v1/audit-logs?page=2&pageSize=20&from=2026-03-01&to=2026-03-04&action=PAYMENT_REQUEST_CREATED',
    );
  });
});
