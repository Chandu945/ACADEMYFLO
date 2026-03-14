import { listStudents, createStudent, updateStudent } from './student-api';
import * as apiClient from '../http/api-client';
import { ok } from '../../domain/common/result';

jest.mock('../http/api-client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
  apiPatch: jest.fn(),
}));

const mockApiGet = apiClient.apiGet as jest.Mock;
const mockApiPost = apiClient.apiPost as jest.Mock;
const mockApiPatch = (apiClient as Record<string, unknown>)['apiPatch'] as jest.Mock;

describe('student-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listStudents', () => {
    it('builds URL with page and pageSize', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await listStudents({}, 1, 20);

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('/api/v1/students?'));
      const url = mockApiGet.mock.calls[0][0] as string;
      expect(url).toContain('page=1');
      expect(url).toContain('pageSize=20');
    });

    it('includes status filter in URL', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await listStudents({ status: 'ACTIVE' }, 1, 20);

      const url = mockApiGet.mock.calls[0][0] as string;
      expect(url).toContain('status=ACTIVE');
    });

    it('includes search filter in URL', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await listStudents({ search: 'test' }, 1, 20);

      const url = mockApiGet.mock.calls[0][0] as string;
      expect(url).toContain('search=test');
    });

    it('includes feeFilter in URL', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await listStudents({ feeFilter: 'DUE' }, 1, 20);

      const url = mockApiGet.mock.calls[0][0] as string;
      expect(url).toContain('feeFilter=DUE');
    });

    it('includes month in URL', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await listStudents({ month: '2026-01' }, 1, 20);

      const url = mockApiGet.mock.calls[0][0] as string;
      expect(url).toContain('month=2026-01');
    });

    it('combines multiple filters', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await listStudents(
        { status: 'ACTIVE', feeFilter: 'DUE', search: 'test', month: '2026-03' },
        2,
        10,
      );

      const url = mockApiGet.mock.calls[0][0] as string;
      expect(url).toContain('status=ACTIVE');
      expect(url).toContain('feeFilter=DUE');
      expect(url).toContain('search=test');
      expect(url).toContain('month=2026-03');
      expect(url).toContain('page=2');
      expect(url).toContain('pageSize=10');
    });
  });

  describe('createStudent', () => {
    it('sends POST to /api/v1/students', async () => {
      mockApiPost.mockResolvedValue(ok({}));
      const req = { fullName: 'Test' } as never;

      await createStudent(req);

      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/students', req);
    });
  });

  describe('updateStudent', () => {
    it('sends PATCH to /api/v1/students/:id', async () => {
      mockApiPatch.mockResolvedValue(ok({}));
      const req = { fullName: 'Updated' } as never;

      await updateStudent('s1', req);

      expect(mockApiPatch).toHaveBeenCalledWith('/api/v1/students/s1', req);
    });
  });
});
