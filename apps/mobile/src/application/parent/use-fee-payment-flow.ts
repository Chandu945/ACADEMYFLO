import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  FeePaymentFlowStatus,
  InitiateFeePaymentResponse,
  FeePaymentStatusResponse,
} from '../../domain/parent/parent.types';
import { initiateFeePaymentUseCase } from './use-cases/initiate-fee-payment.usecase';
import type { InitiateFeePaymentApiPort } from './use-cases/initiate-fee-payment.usecase';
import { pollFeePaymentStatusUseCase } from './use-cases/poll-fee-payment-status.usecase';
import type { PollFeePaymentStatusApiPort } from './use-cases/poll-fee-payment-status.usecase';
import type { CheckoutPort } from '../payments/ports';

// Exponential backoff (in ms) per attempt; last value repeats for remaining
// attempts. Prior linear 3s retry meant every parent polling concurrently
// would hammer the verify endpoint on a transient 429 / 5xx.
const POLL_BACKOFF_MS = [2000, 3000, 5000, 8000, 13000, 21000, 30000];
const MAX_POLL_ATTEMPTS = 20;

function getPollDelay(attempt: number): number {
  return POLL_BACKOFF_MS[Math.min(attempt, POLL_BACKOFF_MS.length - 1)]!;
}

export type UseFeePaymentFlowReturn = {
  status: FeePaymentFlowStatus;
  error: string | null;
  /**
   * Backend AppError.code captured on the most recent failure. UI uses this
   * to distinguish "intentionally unavailable" (FEATURE_DISABLED, e.g. when
   * the parent-online-payments kill-switch is off) from "something actually
   * broke" (NETWORK, UNKNOWN, etc).
   */
  errorCode: string | null;
  orderId: string | null;
  paymentResult: FeePaymentStatusResponse | null;
  startPayment: (feeDueId: string) => Promise<void>;
  reset: () => void;
};

export type UseFeePaymentFlowDeps = {
  parentApi: InitiateFeePaymentApiPort & PollFeePaymentStatusApiPort;
  checkout: CheckoutPort;
};

export function useFeePaymentFlow(
  deps: UseFeePaymentFlowDeps,
  onSuccess: () => void,
): UseFeePaymentFlowReturn {
  const [status, setStatus] = useState<FeePaymentFlowStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<FeePaymentStatusResponse | null>(null);
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
        setErrorCode('TIMEOUT');
        return;
      }

      const result = await pollFeePaymentStatusUseCase(deps, oid);

      if (!mountedRef.current) return;

      const data = result.ok ? result.value : null;

      if (!result.ok) {
        const code = result.error.code;
        if (code === 'FORBIDDEN' || code === 'NOT_FOUND' || code === 'VALIDATION') {
          setStatus('failed');
          setError(result.error.message);
          setErrorCode(code);
          return;
        }
        pollRef.current = setTimeout(() => pollStatus(oid, attempt + 1), getPollDelay(attempt));
        return;
      }

      setPaymentResult(data);

      if (data!.status === 'SUCCESS') {
        setStatus('success');
        onSuccess();
        return;
      }

      if (data!.status === 'FAILED') {
        setStatus('failed');
        setError('Payment failed. Please try again.');
        setErrorCode('PAYMENT_FAILED');
        return;
      }

      pollRef.current = setTimeout(() => pollStatus(oid, attempt + 1), getPollDelay(attempt));
    },
    [deps, onSuccess],
  );

  const startPayment = useCallback(
    async (feeDueId: string) => {
      // Prevent double-tap: ignore if already in progress
      if (status !== 'idle' && status !== 'failed') return;
      if (startingRef.current) return;
      startingRef.current = true;

      try {
        setStatus('initiating');
        setError(null);
        setErrorCode(null);
        setPaymentResult(null);

        const result = await initiateFeePaymentUseCase(deps, feeDueId);

        if (!mountedRef.current) return;

        if (!result.ok) {
          setStatus('failed');
          setError(result.error.message);
          setErrorCode(result.error.code);
          return;
        }

        const data: InitiateFeePaymentResponse = result.value;
        setOrderId(data.orderId);
        setStatus('checkout');

        try {
          await deps.checkout.openCheckout(data.paymentSessionId, data.orderId);
        } catch {
          // If browser open fails, still start polling
        }

        if (!mountedRef.current) return;

        setStatus('polling');
        pollStatus(data.orderId);
      } finally {
        startingRef.current = false;
      }
    },
    [deps, pollStatus, status],
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setError(null);
    setErrorCode(null);
    setOrderId(null);
    setPaymentResult(null);
  }, [stopPolling]);

  return {
    status,
    error,
    errorCode,
    orderId,
    paymentResult,
    startPayment,
    reset,
  };
}
