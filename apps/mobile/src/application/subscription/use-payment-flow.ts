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

/** Exponential backoff schedule (ms). Roughly ~2 minutes total — enough for
 *  a real Cashfree confirmation without battering the server for minutes. */
const POLL_SCHEDULE_MS = [2000, 3000, 5000, 8000, 13000, 21000, 30000, 30000];

export type UsePaymentFlowReturn = {
  status: PaymentFlowStatus;
  error: string | null;
  orderId: string | null;
  paymentResult: PaymentStatusResponse | null;
  startPayment: () => Promise<void>;
  /** Resume polling for a PENDING payment from a previous session (e.g. after
   *  an app kill mid-checkout). Idempotent: safe to call repeatedly; a no-op
   *  if a flow is already in progress. */
  resumePayment: (orderId: string) => void;
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
    async (oid: string, attempt = 0, sessionExpiresAtMs?: number) => {
      if (!mountedRef.current) return;

      // Bail early if the Cashfree session has expired. `sessionExpiresAtMs`
      // is undefined on the resume path (server will still surface EXPIRED
      // via the status endpoint thanks to the poll-time verification).
      if (sessionExpiresAtMs && Date.now() > sessionExpiresAtMs) {
        setStatus('failed');
        setError('Payment session expired. Please try again.');
        return;
      }

      if (attempt >= POLL_SCHEDULE_MS.length) {
        setStatus('failed');
        setError('Payment verification timed out. Please check back later.');
        return;
      }

      const result = await pollSubscriptionPaymentStatusUseCase(deps, oid);

      if (!mountedRef.current) return;

      const nextDelay = POLL_SCHEDULE_MS[attempt] ?? 30000;

      if (!result.ok) {
        const code = result.error.code;
        if (code === 'FORBIDDEN' || code === 'NOT_FOUND' || code === 'VALIDATION') {
          setStatus('failed');
          setError(result.error.message);
          return;
        }
        // Transient error — retry with the next backoff slot.
        if (mountedRef.current) {
          pollRef.current = setTimeout(
            () => pollStatus(oid, attempt + 1, sessionExpiresAtMs),
            nextDelay,
          );
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

      // Still PENDING — continue polling with the next backoff slot.
      if (mountedRef.current) {
        pollRef.current = setTimeout(
          () => pollStatus(oid, attempt + 1, sessionExpiresAtMs),
          nextDelay,
        );
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

      // Start polling for payment status. If Cashfree gave us an expiresAt
      // we use it to fail fast once the session is known to be dead.
      const expiresAtMs = Number.isFinite(Date.parse(data.expiresAt))
        ? Date.parse(data.expiresAt)
        : undefined;
      setStatus('polling');
      pollStatus(data.orderId, 0, expiresAtMs);
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

  const resumePayment = useCallback(
    (oid: string) => {
      // Only resume when genuinely idle — never clobber an in-flight flow.
      if (status !== 'idle') return;
      if (!oid) return;
      setError(null);
      setPaymentResult(null);
      setOrderId(oid);
      setStatus('polling');
      pollStatus(oid);
    },
    [status, pollStatus],
  );

  return {
    status,
    error,
    orderId,
    paymentResult,
    startPayment,
    resumePayment,
    reset,
  };
}
