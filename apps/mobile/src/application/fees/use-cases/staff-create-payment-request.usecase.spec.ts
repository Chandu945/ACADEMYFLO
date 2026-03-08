import {
  staffCreatePaymentRequestUseCase,
  validatePaymentRequestForm,
} from './staff-create-payment-request.usecase';
import { ok, err } from '../../../domain/common/result';

describe('validatePaymentRequestForm', () => {
  it('returns error when notes are too short', () => {
    const errors = validatePaymentRequestForm({ staffNotes: 'abc' });
    expect(errors['staffNotes']).toBe('Notes must be at least 5 characters');
  });

  it('returns error when notes are empty', () => {
    const errors = validatePaymentRequestForm({ staffNotes: '' });
    expect(errors['staffNotes']).toBe('Notes must be at least 5 characters');
  });

  it('returns no errors for valid notes', () => {
    const errors = validatePaymentRequestForm({
      staffNotes: 'Collected cash from guardian',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('staffCreatePaymentRequestUseCase', () => {
  it('calls correct endpoint and returns result', async () => {
    const mockApi = {
      createPaymentRequest: jest.fn().mockResolvedValue(
        ok({
          id: 'pr1',
          academyId: 'a1',
          studentId: 's1',
          studentName: 'John Doe',
          feeDueId: 'fd1',
          monthKey: '2026-03',
          amount: 500,
          staffUserId: 'u2',
          staffName: 'Staff User',
          staffNotes: 'Collected cash',
          status: 'PENDING',
          reviewedByUserId: null,
          reviewedByName: null,
          reviewedAt: null,
          rejectionReason: null,
          createdAt: '2026-03-04T10:00:00.000Z',
          updatedAt: '2026-03-04T10:00:00.000Z',
        }),
      ),
    };

    const result = await staffCreatePaymentRequestUseCase(
      { paymentRequestsApi: mockApi },
      { studentId: 's1', monthKey: '2026-03', staffNotes: 'Collected cash' },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PENDING');
      expect(result.value.staffNotes).toBe('Collected cash');
    }
    expect(mockApi.createPaymentRequest).toHaveBeenCalledWith({
      studentId: 's1',
      monthKey: '2026-03',
      staffNotes: 'Collected cash',
    });
  });

  it('propagates API errors', async () => {
    const mockApi = {
      createPaymentRequest: jest
        .fn()
        .mockResolvedValue(err({ code: 'CONFLICT', message: 'Pending request already exists' })),
    };

    const result = await staffCreatePaymentRequestUseCase(
      { paymentRequestsApi: mockApi },
      { studentId: 's1', monthKey: '2026-03', staffNotes: 'Collected cash' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });
});
