import { listStaff, createStaff, updateStaff, setStaffStatus } from './staff-api';
import * as apiClient from '../http/api-client';
import { ok } from '../../domain/common/result';

jest.mock('../http/api-client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
}));

describe('staff-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listStaff builds correct URL with pagination', async () => {
    (apiClient.apiGet as jest.Mock).mockResolvedValue(ok({ data: [], meta: {} }));
    await listStaff(2, 10);
    expect(apiClient.apiGet).toHaveBeenCalledWith('/api/v1/staff?page=2&pageSize=10');
  });

  it('createStaff posts to correct endpoint', async () => {
    (apiClient.apiPost as jest.Mock).mockResolvedValue(ok({}));
    const input = {
      fullName: 'Test',
      email: 'test@example.com',
      phoneNumber: '+919876543210',
      password: 'Password1!',
    };
    await createStaff(input);
    expect(apiClient.apiPost).toHaveBeenCalledWith('/api/v1/staff', input);
  });

  it('updateStaff patches correct endpoint', async () => {
    (apiClient.apiPatch as jest.Mock).mockResolvedValue(ok({}));
    await updateStaff('s1', { fullName: 'Updated' });
    expect(apiClient.apiPatch).toHaveBeenCalledWith('/api/v1/staff/s1', { fullName: 'Updated' });
  });

  it('setStaffStatus patches correct endpoint', async () => {
    (apiClient.apiPatch as jest.Mock).mockResolvedValue(ok({}));
    await setStaffStatus('s1', { status: 'INACTIVE' });
    expect(apiClient.apiPatch).toHaveBeenCalledWith('/api/v1/staff/s1/status', {
      status: 'INACTIVE',
    });
  });
});
