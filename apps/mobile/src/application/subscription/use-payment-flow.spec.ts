import { renderHook, act } from '@testing-library/react-native';
import { usePaymentFlow } from './use-payment-flow';

const subscriptionApi = {
  getMySubscription: jest.fn(),
  initiatePayment: jest.fn(),
  getPaymentStatus: jest.fn(),
};
const openCashfreeCheckout = jest.fn().mockResolvedValue(undefined);
const deps = {
  subscriptionApi,
  checkout: { openCheckout: openCashfreeCheckout },
};

describe('usePaymentFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in idle state', () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePaymentFlow(deps, onSuccess));
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.orderId).toBeNull();
  });

  it('initiates payment and opens checkout', async () => {
    subscriptionApi.initiatePayment.mockResolvedValue({
      ok: true,
      value: {
        orderId: 'pc_sub_test',
        paymentSessionId: 'session_123',
        amountInr: 299,
        currency: 'INR',
        tierKey: 'TIER_0_50',
        expiresAt: '2026-03-15T13:00:00Z',
      },
    });

    subscriptionApi.getPaymentStatus.mockResolvedValue({
      ok: true,
      value: {
        orderId: 'pc_sub_test',
        status: 'SUCCESS',
        tierKey: 'TIER_0_50',
        amountInr: 299,
        providerPaymentId: 'cf_123',
        paidAt: '2026-03-15T12:00:00Z',
        subscription: { status: 'ACTIVE_PAID', paidStartAt: '2026-04-01', paidEndAt: '2026-04-30' },
      },
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePaymentFlow(deps, onSuccess));

    await act(async () => {
      await result.current.startPayment();
    });

    expect(openCashfreeCheckout).toHaveBeenCalledWith('session_123', 'pc_sub_test');
  });

  it('shows error on initiation failure', async () => {
    subscriptionApi.initiatePayment.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'Payment already in progress' },
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePaymentFlow(deps, onSuccess));

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('Payment already in progress');
  });

  it('fails fast when checkout rejects (e.g. Cashfree onError)', async () => {
    subscriptionApi.initiatePayment.mockResolvedValue({
      ok: true,
      value: {
        orderId: 'pc_sub_test',
        paymentSessionId: 'session_123',
        amountInr: 299,
        currency: 'INR',
        tierKey: 'TIER_0_50',
        expiresAt: '2026-03-15T13:00:00Z',
      },
    });
    openCashfreeCheckout.mockRejectedValueOnce(new Error('Invalid payment session'));

    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePaymentFlow(deps, onSuccess));

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('Invalid payment session');
    expect(subscriptionApi.getPaymentStatus).not.toHaveBeenCalled();
  });

  it('reset returns to idle state', async () => {
    subscriptionApi.initiatePayment.mockResolvedValue({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Error' },
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePaymentFlow(deps, onSuccess));

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.status).toBe('failed');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
