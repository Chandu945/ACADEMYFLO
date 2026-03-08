import { markAttendanceUseCase } from './mark-attendance.usecase';
import { ok, err } from '../../../domain/common/result';

describe('markAttendanceUseCase', () => {
  it('returns mapped result on success', async () => {
    const mockApi = {
      markAttendance: jest
        .fn()
        .mockResolvedValue(ok({ studentId: 's1', date: '2026-03-04', status: 'ABSENT' })),
    };

    const result = await markAttendanceUseCase(
      { attendanceApi: mockApi },
      's1',
      '2026-03-04',
      'ABSENT',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.studentId).toBe('s1');
      expect(result.value.status).toBe('ABSENT');
    }
    expect(mockApi.markAttendance).toHaveBeenCalledWith('s1', '2026-03-04', 'ABSENT');
  });

  it('propagates API errors', async () => {
    const mockApi = {
      markAttendance: jest
        .fn()
        .mockResolvedValue(err({ code: 'CONFLICT', message: 'Holiday – attendance not required' })),
    };

    const result = await markAttendanceUseCase(
      { attendanceApi: mockApi },
      's1',
      '2026-03-04',
      'ABSENT',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('returns error on invalid response shape', async () => {
    const mockApi = {
      markAttendance: jest.fn().mockResolvedValue(ok({ unexpected: 'shape' })),
    };

    const result = await markAttendanceUseCase(
      { attendanceApi: mockApi },
      's1',
      '2026-03-04',
      'ABSENT',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN');
    }
  });
});
