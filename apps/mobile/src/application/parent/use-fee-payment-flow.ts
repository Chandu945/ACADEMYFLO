import { useState, useCallback, useRef } from 'react';
import type {
  FeePaymentFlowStatus,
  InitiateFeePaymentResponse,
  FeePaymentStatusResponse,
} from '../../domain/parent/parent.types';
import { initiateFeePaymentUseCase } from './use-cases/initiate-fee-payment.usecase';
import { pollFeePaymentStatusUseCase } from './use-cases/poll-fee-payment-status.usecase';
import { parentApi } from '../../infra/parent/parent-api';
import { openCashfreeCheckout } from '../../infra/payments/cashfree-web-checkout';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

export type UseFeePaymentFlowReturn = {
  status: FeePaymentFlowStatus;
  error: string | null;
  orderId: string | null;
  paymentResult: FeePaymentStatusResponse | null;
  startPayment: (feeDueId: string) => Promise<void>;
  reset: () => void;
};

export function useFeePaymentFlow(onSuccess: () => void): UseFeePaymentFlowReturn {
  const [status, setStatus] = useState<FeePaymentFlowStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<FeePaymentStatusResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deps = { parentApi };

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (oid: string, attempt = 0) => {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setStatus('failed');
        setError('Payment verification timed out. Please check back later.');
        return;
      }

      const result = await pollFeePaymentStatusUseCase(deps, oid);

      if (!result.ok) {
        pollRef.current = setTimeout(() => pollStatus(oid, attempt + 1), POLL_INTERVAL_MS);
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

      pollRef.current = setTimeout(() => pollStatus(oid, attempt + 1), POLL_INTERVAL_MS);
    },
    [deps, onSuccess],
  );

  const startPayment = useCallback(
    async (feeDueId: string) => {
      setStatus('initiating');
      setError(null);
      setPaymentResult(null);

      const result = await initiateFeePaymentUseCase(deps, feeDueId);

      if (!result.ok) {
        setStatus('failed');
        setError(result.error.message);
        return;
      }

      const data: InitiateFeePaymentResponse = result.value;
      setOrderId(data.orderId);
      setStatus('checkout');

      try {
        await openCashfreeCheckout(data.paymentSessionId, data.orderId);
      } catch {
        // If browser open fails, still start polling
      }

      setStatus('polling');
      pollStatus(data.orderId);
    },
    [deps, pollStatus],
  );

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
