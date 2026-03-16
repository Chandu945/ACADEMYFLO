import { listStudentsUseCase } from './list-students.usecase';
import type { StudentApiPort } from './list-students.usecase';
import { ok, err } from '../../../domain/common/result';
import type { StudentListFilters } from '../../../domain/student/student.types';
import type { StudentListApiResponse } from '../../../domain/student/student.schemas';

function makeValidResponse(): StudentListApiResponse {
  return {
    data: [
      {
        id: 's1',
        academyId: 'a1',
        fullName: 'Test Student',
        dateOfBirth: '2010-01-01',
        gender: 'MALE',
        address: {
          line1: '123 St',
          line2: null,
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
        },
        guardian: {
          name: 'Parent',
          mobile: '+919876543210',
          email: 'p@test.com',
        },
        joiningDate: '2024-01-01',
        monthlyFee: 500,
        mobileNumber: null,
        email: null,
        profilePhotoUrl: null,
        fatherName: null,
        motherName: null,
        whatsappNumber: null,
        addressText: null,
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
  };
}

function makeMockApi(result: ReturnType<typeof ok | typeof err>): StudentApiPort {
  return { listStudents: jest.fn().mockResolvedValue(result) };
}

describe('listStudentsUseCase', () => {
  it('maps API response correctly', async () => {
    const payload = makeValidResponse();
    const api = makeMockApi(ok(payload));
    const filters: StudentListFilters = {};

    const result = await listStudentsUseCase({ studentApi: api }, filters, 1, 20);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]!.fullName).toBe('Test Student');
      expect(result.value.meta.totalItems).toBe(1);
    }
  });

  it('passes filters, page, and pageSize to API', async () => {
    const payload = makeValidResponse();
    const api = makeMockApi(ok(payload));
    const filters: StudentListFilters = { status: 'ACTIVE', feeFilter: 'DUE' };

    await listStudentsUseCase({ studentApi: api }, filters, 2, 10);

    expect(api.listStudents).toHaveBeenCalledWith(filters, 2, 10);
  });

  it('propagates API errors', async () => {
    const api = makeMockApi(err({ code: 'NETWORK' as const, message: 'Network error' }));
    const filters: StudentListFilters = {};

    const result = await listStudentsUseCase({ studentApi: api }, filters, 1, 20);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });

  it('returns error for invalid payload', async () => {
    const api = makeMockApi(ok({ invalid: true }));
    const filters: StudentListFilters = {};

    const result = await listStudentsUseCase({ studentApi: api }, filters, 1, 20);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toBe('Unexpected server response');
    }
  });
});
