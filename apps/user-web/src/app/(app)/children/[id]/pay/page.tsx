'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/application/auth/use-auth';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

interface FeeDue {
  id: string;
  studentName?: string;
  month?: string;
  feeAmount: number;
  lateFee?: number;
  totalAmount: number;
}

export default function FeePaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const studentId = params.id as string;
  const dueId = searchParams.get('dueId');

  const [fee, setFee] = useState<FeeDue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const fetchFees = useCallback(async () => {
    if (!accessToken || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/parent/children/${studentId}/fees`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load fee details');
      }
      const data = await res.json();

      // If a dueId is specified, find the matching due; otherwise use the first one
      if (dueId) {
        const dues: FeeDue[] = Array.isArray(data) ? data : data.dues ?? data.fees ?? [];
        const matched = dues.find((d) => d.id === dueId);
        if (!matched) {
          throw new Error('Fee due not found');
        }
        setFee(matched);
      } else if (Array.isArray(data) && data.length > 0) {
        setFee(data[0]);
      } else if (data && !Array.isArray(data)) {
        setFee(data);
      } else {
        throw new Error('No fee dues found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [accessToken, studentId, dueId]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handlePay = async () => {
    if (!accessToken || !fee) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/parent/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ feeDueId: dueId ?? fee.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Payment initiation failed');
      }
      const data = await res.json();

      // Redirect to the payment gateway
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else if (data.paymentSessionId) {
        window.location.href = data.paymentSessionId;
      } else {
        throw new Error('No payment URL received from server');
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed');
      setPaying(false);
    }
  };

  if (loading) {
    return <Spinner centered size="lg" />;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Alert
          variant="error"
          message={error}
          action={{ label: 'Retry', onClick: fetchFees }}
        />
      </div>
    );
  }

  if (!fee) {
    return (
      <div className={styles.page}>
        <Alert variant="info" message="No fee details available." />
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Fee Payment</h1>

        <div className={styles.summary}>
          {fee.studentName && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Student</span>
              <span className={styles.summaryValue}>{fee.studentName}</span>
            </div>
          )}

          {fee.month && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Month</span>
              <span className={styles.summaryValue}>{fee.month}</span>
            </div>
          )}

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Fee Amount</span>
            <span className={styles.summaryValue}>
              {formatCurrency(fee.feeAmount)}
            </span>
          </div>

          {fee.lateFee != null && fee.lateFee > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Late Fee</span>
              <span className={`${styles.summaryValue} ${styles.lateFee}`}>
                {formatCurrency(fee.lateFee)}
              </span>
            </div>
          )}

          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span className={styles.totalLabel}>Total Amount</span>
            <span className={styles.totalValue}>
              {formatCurrency(fee.totalAmount)}
            </span>
          </div>
        </div>

        {payError && (
          <Alert
            variant="error"
            message={payError}
            onDismiss={() => setPayError(null)}
          />
        )}

        <div className={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={paying}
            onClick={handlePay}
          >
            Pay Now
          </Button>

          <Link href={`/children/${studentId}`} className={styles.cancelLink}>
            <Button variant="outline" size="md" fullWidth disabled={paying}>
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
