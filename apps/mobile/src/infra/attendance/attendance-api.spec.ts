import {
  getDailyAttendance,
  markAttendance,
  bulkSetAbsences,
  getDailyReport,
  getMonthlySummary,
  getStudentMonthlyDetail,
} from './attendance-api';
import * as apiClient from '../http/api-client';
import { ok } from '../../domain/common/result';

jest.mock('../http/api-client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
  apiDelete: jest.fn(),
}));

const mockApiGet = apiClient.apiGet as jest.Mock;
const mockApiPut = apiClient.apiPut as jest.Mock;

describe('attendance-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyAttendance', () => {
    it('builds URL with date, page, and pageSize', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await getDailyAttendance('2026-03-04', 1, 50);

      const url = mockApiGet.mock.calls[0]![0] as string;
      expect(url).toContain('/api/v1/attendance/students?');
      expect(url).toContain('date=2026-03-04');
      expect(url).toContain('page=1');
      expect(url).toContain('pageSize=50');
    });
  });

  describe('markAttendance', () => {
    it('sends PUT with student ID, date, and status', async () => {
      mockApiPut.mockResolvedValue(ok({}));

      await markAttendance('s1', '2026-03-04', 'ABSENT');

      expect(mockApiPut).toHaveBeenCalledWith('/api/v1/attendance/students/s1?date=2026-03-04', {
        status: 'ABSENT',
      });
    });
  });

  describe('bulkSetAbsences', () => {
    it('sends PUT to bulk endpoint with absent student IDs', async () => {
      mockApiPut.mockResolvedValue(ok({}));

      await bulkSetAbsences('2026-03-04', ['s1', 's2']);

      expect(mockApiPut).toHaveBeenCalledWith('/api/v1/attendance/students/bulk?date=2026-03-04', {
        absentStudentIds: ['s1', 's2'],
      });
    });
  });

  describe('getDailyReport', () => {
    it('builds URL with date', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await getDailyReport('2026-03-04');

      expect(mockApiGet).toHaveBeenCalledWith('/api/v1/attendance/reports/daily?date=2026-03-04');
    });
  });

  describe('getMonthlySummary', () => {
    it('builds URL with month, page, and pageSize', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await getMonthlySummary('2026-03', 1, 50);

      const url = mockApiGet.mock.calls[0]![0] as string;
      expect(url).toContain('/api/v1/attendance/reports/monthly/summary?');
      expect(url).toContain('month=2026-03');
      expect(url).toContain('page=1');
      expect(url).toContain('pageSize=50');
    });
  });

  describe('getStudentMonthlyDetail', () => {
    it('builds URL with student ID and month', async () => {
      mockApiGet.mockResolvedValue(ok({}));

      await getStudentMonthlyDetail('s1', '2026-03');

      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/v1/attendance/reports/monthly/student/s1?month=2026-03',
      );
    });
  });
});
