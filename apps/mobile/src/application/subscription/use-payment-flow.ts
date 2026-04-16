import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  PaymentFlowStatus,
  InitiatePaymentResponse,
  PaymentStatusResponse,
} from '../../domain/payments/cashfree.types';
import { initiateSubscriptionPaymentUseCase } from './use-cases/initiate-subscription-payment.usecase';
import { pollSubscriptionPaymentStatusUseCase } from './use-cases/poll-subscription-payment-status.usecase';
import type { SubscriptionApiPort } from './ports';
import type { CheckoutPort } from '../payments/ports';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

export type UsePaymentFlowReturn = {
  status: PaymentFlowStatus;
  error: string | null;
  orderId: string | null;
  paymentResult: PaymentStatusResponse | null;
  startPayment: () => Promise<void>;
  reset: () => void;
};

export type UsePaymentFlowDeps = {
  subscriptionApi: SubscriptionApiPort;
  checkout: CheckoutPort;
};

export function usePaymentFlow(
  deps: UsePaymentFlowDeps,
  onSuccess: () => void,
): UsePaymentFlowReturn {
  const [status, setStatus] = useState<PaymentFlowStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentStatusResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (oid: string, attempt = 0) => {
      if (!mountedRef.current) return;

      if (attempt >= MAX_POLL_ATTEMPTS) {
        setStatus('failed');
        setError('Payment verification timed out. Please check back later.');
        return;
      }

      const result = await pollSubscriptionPaymentStatusUseCase(deps, oid);

      if (!mountedRef.current) return;

      if (!result.ok) {
        const code = result.error.code;
        if (code === 'FORBIDDEN' || code === 'NOT_FOUND' || code === 'VALIDATION') {
          setStatus('failed');
          setError(result.error.message);
          return;
        }
        // Transient error — retry (only if still mounted)
        if (mountedRef.current) {
          pollRef.current = setTimeout(() => pollStatus(oid, attempt + 1), POLL_INTERVAL_MS);
        }
        return;
      }

      const data = result.value;
      setPaymentResult(data);

      if (data.status === 'SUCCESS') {
        setStatus('success');
        onSuccess();
        return;
      }

      if (data.status === 'FAILED') {
        setStatus('failed');
        setError('Payment failed. Please try again.');
        return;
      }

      // Still PENDING — continue polling (only if still mounted)
      if (mountedRef.current) {
        pollRef.current = setTimeout(() => pollStatus(oid, attempt + 1), POLL_INTERVAL_MS);
      }
    },
    [deps, onSuccess],
  );

  const startPayment = useCallback(async () => {
    // Prevent double-tap: ignore if already in progress
    if (status !== 'idle' && status !== 'failed') return;
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      setStatus('initiating');
      setError(null);
      setPaymentResult(null);

      const result = await initiateSubscriptionPaymentUseCase(deps);

      if (!mountedRef.current) return;

      if (!result.ok) {
        setStatus('failed');
        setError(result.error.message);
        return;
      }

      const data: InitiatePaymentResponse = result.value;
      setOrderId(data.orderId);
      setStatus('checkout');

      // Open checkout (web SDK or native fallback)
      try {
        await deps.checkout.openCheckout(data.paymentSessionId, data.orderId);
      } catch {
        // If browser open fails, still start polling
      }

      if (!mountedRef.current) return;

      // Start polling for payment status
      setStatus('polling');
      pollStatus(data.orderId);
    } finally {
      startingRef.current = false;
    }
  }, [deps, pollStatus, status]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setError(null);
    setOrderId(null);
    setPaymentResult(null);
  }, [stopPolling]);

  return {
    status,
    error,
    orderId,
    paymentResult,
    startPayment,
    reset,
  };
}
