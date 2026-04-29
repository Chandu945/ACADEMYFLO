'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/application/auth/use-auth';
import { csrfHeaders } from '@/infra/auth/csrf-client';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Manual payment fallback for parents — UPI / bank transfer with proof
 * image upload. Mirrors apps/mobile's ManualPaymentScreen
 * (`/parent/ManualPaymentScreen.tsx`). Goes through the new BFF routes:
 *   GET  /api/parent/payment-methods      — fetch academy bank/UPI details
 *   POST /api/parent/payment-requests     — submit request with proof
 *
 * Owner approves the request out-of-band; parent gets a notification when
 * it's reviewed.
 */

type PaymentMethods = {
  manualPaymentsEnabled?: boolean;
  upiId?: string | null;
  upiHolderName?: string | null;
  upiQrImageUrl?: string | null;
  bankAccountHolderName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankName?: string | null;
  bankBranchName?: string | null;
};

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function ManualPayPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accessToken } = useAuth();

  const feeDueId = searchParams.get('feeDueId') ?? '';
  const amountFromQuery = Number(searchParams.get('amount') ?? '0') || 0;

  const [methods, setMethods] = useState<PaymentMethods | null>(null);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsError, setMethodsError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'UPI' | 'BANK'>('UPI');
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [parentNote, setParentNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    setMethodsLoading(true);
    setMethodsError(null);
    fetch('/api/parent/payment-methods', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    })
      .then(async (res) => {
        if (cancelled) return;
        const json = (await res.json().catch(() => null)) as PaymentMethods | { message?: string } | null;
        if (!res.ok || !json) {
          setMethodsError((json as { message?: string } | null)?.message ?? 'Failed to load payment methods');
          return;
        }
        setMethods(json as PaymentMethods);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setMethodsError('Network error.');
      })
      .finally(() => {
        if (!cancelled) setMethodsLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken]);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setProofFile(null);
      return;
    }
    if (!ALLOWED_PROOF_TYPES.has(file.type)) {
      setProofError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setProofError('Image must be smaller than 5 MB.');
      return;
    }
    setProofFile(file);
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        // Toast-less for now; Alert below would be more disruptive than helpful.
        console.info(`Copied ${label}`);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.id || !feeDueId || submitting || !accessToken) return;

    setSubmitError(null);
    if (!proofFile) {
      setSubmitError('Attach a screenshot of your payment as proof.');
      return;
    }
    if (amountFromQuery <= 0) {
      setSubmitError('Could not determine payment amount. Go back and pick the fee again.');
      return;
    }
    if (activeTab === 'UPI' && !paymentRefNumber.trim()) {
      setSubmitError('Enter the UPI transaction reference number.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('studentId', params.id);
      form.append('feeDueId', feeDueId);
      form.append('amount', String(amountFromQuery));
      form.append('paymentMethod', activeTab);
      if (paymentRefNumber.trim()) form.append('paymentRefNumber', paymentRefNumber.trim());
      if (parentNote.trim()) form.append('parentNote', parentNote.trim());
      form.append('file', proofFile, proofFile.name);

      const res = await fetch('/api/parent/payment-requests', {
        method: 'POST',
        headers: csrfHeaders({
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        }),
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
      const json = (await res.json().catch(() => null)) as { message?: string; data?: unknown } | null;
      if (!res.ok) {
        setSubmitError(json?.message ?? 'Failed to submit payment request.');
        return;
      }
      setSubmitted(true);
      setTimeout(() => router.replace(`/children/${params.id}`), 1500);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (methodsLoading) return <Spinner centered size="lg" />;
  if (methodsError) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
        <Alert variant="error" message={methodsError} action={{ label: 'Back', onClick: () => router.back() }} />
      </div>
    );
  }
  if (methods && methods.manualPaymentsEnabled === false) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
        <Alert
          variant="warning"
          title="Manual payments aren't enabled"
          message="Your academy hasn't enabled manual (UPI / bank transfer) payments. Please use the online payment option instead."
          action={{ label: 'Back', onClick: () => router.back() }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Submit manual payment</h1>

      {submitted && (
        <Alert
          variant="success"
          title="Request submitted"
          message="Your academy will review and confirm this payment shortly. You'll see the receipt once it's approved."
        />
      )}

      <Card>
        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <Button
            variant={activeTab === 'UPI' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('UPI')}
            disabled={submitting}
          >
            UPI
          </Button>
          <Button
            variant={activeTab === 'BANK' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('BANK')}
            disabled={submitting}
          >
            Bank Transfer
          </Button>
        </div>

        {/* Method details */}
        {activeTab === 'UPI' && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: 8, fontWeight: 500 }}>Pay to UPI ID</p>
            {methods?.upiId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ padding: '4px 8px', background: 'var(--color-surface-secondary)', borderRadius: 4 }}>
                  {methods.upiId}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopy(methods.upiId!, 'UPI ID')}>
                  Copy
                </Button>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>No UPI ID configured. Use bank transfer.</p>
            )}
            {methods?.upiHolderName && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                Account holder: {methods.upiHolderName}
              </p>
            )}
            {methods?.upiQrImageUrl && (
              <img
                src={methods.upiQrImageUrl}
                alt="UPI QR"
                style={{ maxWidth: 200, marginTop: 8, borderRadius: 8 }}
              />
            )}
          </div>
        )}

        {activeTab === 'BANK' && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: 8, fontWeight: 500 }}>Pay via NEFT / IMPS</p>
            {methods?.bankAccountNumber ? (
              <div style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
                <div><strong>Account:</strong> {methods.bankAccountNumber}</div>
                <div><strong>IFSC:</strong> {methods.bankIfscCode}</div>
                {methods.bankName && <div><strong>Bank:</strong> {methods.bankName}</div>}
                {methods.bankBranchName && <div><strong>Branch:</strong> {methods.bankBranchName}</div>}
                {methods.bankAccountHolderName && (
                  <div><strong>Account holder:</strong> {methods.bankAccountHolderName}</div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>Bank details not configured. Use UPI.</p>
            )}
          </div>
        )}

        <hr style={{ margin: '1rem 0' }} />

        {/* Submission form */}
        <form onSubmit={handleSubmit}>
          <Input
            label={activeTab === 'UPI' ? 'UPI Transaction Reference' : 'Bank Reference (optional)'}
            value={paymentRefNumber}
            onChange={(e) => setPaymentRefNumber(e.target.value)}
            placeholder={activeTab === 'UPI' ? '12-digit UPI ref ID' : 'NEFT / IMPS reference'}
            required={activeTab === 'UPI'}
            maxLength={64}
          />
          <Input
            label="Note for academy (optional)"
            value={parentNote}
            onChange={(e) => setParentNote(e.target.value)}
            placeholder="Anything the academy should know"
            maxLength={500}
          />
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
              Payment proof (screenshot) <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleProofChange}
              disabled={submitting}
            />
            {proofFile && (
              <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--color-text-muted)' }}>
                {proofFile.name} ({(proofFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
            {proofError && <Alert variant="error" message={proofError} />}
          </div>

          {amountFromQuery > 0 && (
            <p style={{ marginTop: '1rem', fontWeight: 500 }}>
              Amount: ₹{amountFromQuery.toLocaleString('en-IN')}
            </p>
          )}

          {submitError && <Alert variant="error" message={submitError} />}

          <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
            <Button type="submit" variant="primary" loading={submitting} disabled={submitted}>
              Submit request
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
