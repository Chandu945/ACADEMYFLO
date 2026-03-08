import { listStaffUseCase, type StaffApiPort } from './list-staff.usecase';
import { ok, err } from '../../../domain/common/result';
import type { StaffListApiResponse } from '../../../domain/staff/staff.schemas';

const mockResponse: StaffListApiResponse = {
  data: [
    {
      id: 's1',
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      phoneNumber: '+919876543211',
      role: 'STAFF',
      status: 'ACTIVE',
      academyId: 'a1',
      startDate: null,
      gender: null,
      whatsappNumber: null,
      mobileNumber: null,
      address: null,
      qualificationInfo: null,
      salaryConfig: null,
      profilePhotoUrl: null,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

describe('listStaffUseCase', () => {
  it('maps successful API response correctly', async () => {
    const staffApi: StaffApiPort = {
      listStaff: jest.fn().mockResolvedValue(ok(mockResponse)),
    };

    const result = await listStaffUseCase({ staffApi }, 1, 20);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]?.fullName).toBe('Priya Sharma');
      expect(result.value.meta.totalItems).toBe(1);
    }
    expect(staffApi.listStaff).toHaveBeenCalledWith(1, 20);
  });

  it('propagates API errors', async () => {
    const staffApi: StaffApiPort = {
      listStaff: jest.fn().mockResolvedValue(err({ code: 'NETWORK', message: 'Network error' })),
    };

    const result = await listStaffUseCase({ staffApi }, 1, 20);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Network error');
    }
  });

  it('returns error for invalid server response', async () => {
    const staffApi: StaffApiPort = {
      listStaff: jest.fn().mockResolvedValue(ok({ bad: 'data' })),
    };

    const result = await listStaffUseCase({ staffApi }, 1, 20);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Unexpected server response');
    }
  });
});
