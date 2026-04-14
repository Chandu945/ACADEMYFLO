import { ownerMarkPaidUseCase } from './owner-mark-paid.usecase';
import { ok, err } from '../../../domain/common/result';

describe('ownerMarkPaidUseCase', () => {
  it('returns mapped result on success', async () => {
    const mockApi = {
      markFeePaid: jest.fn().mockResolvedValue(
        ok({
          id: 'fd1',
          academyId: 'a1',
          studentId: 's1',
          monthKey: '2026-03',
          dueDate: '2026-03-10',
          amount: 500,
          status: 'PAID',
          paidAt: '2026-03-04T10:00:00.000Z',
          paidByUserId: 'u1',
          paidSource: 'OWNER_DIRECT',
          paymentLabel: 'CASH',
          collectedByUserId: null,
          approvedByUserId: null,
          paymentRequestId: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-04T10:00:00.000Z',
        }),
      ),
    };

    const result = await ownerMarkPaidUseCase({ feesApi: mockApi }, 's1', '2026-03');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PAID');
      expect(result.value.paidSource).toBe('OWNER_DIRECT');
    }
    expect(mockApi.markFeePaid).toHaveBeenCalledWith('s1', '2026-03', undefined);
  });

  it('propagates API errors', async () => {
    const mockApi = {
      markFeePaid: jest
        .fn()
        .mockResolvedValue(err({ code: 'CONFLICT', message: 'Fee already paid' })),
    };

    const result = await ownerMarkPaidUseCase({ feesApi: mockApi }, 's1', '2026-03');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('returns error on invalid response shape', async () => {
    const mockApi = {
      markFeePaid: jest.fn().mockResolvedValue(ok({ unexpected: 'shape' })),
    };

    const result = await ownerMarkPaidUseCase({ feesApi: mockApi }, 's1', '2026-03');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN');
    }
  });
});
