'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/application/auth/use-auth';
import { useStudents } from '@/application/students/use-students';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

/** Generate month options: current month + 2 past months + 1 future month */
function buildMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let offset = -2; offset <= 1; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    options.push({ value: key, label });
  }
  return options;
}

export default function NewPaymentRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();
  const { data: students, loading: studentsLoading } = useStudents({ status: 'ACTIVE', pageSize: 500 });

  // Edit mode params
  const isEditMode = searchParams.get('edit') === 'true';
  const editRequestId = searchParams.get('requestId') ?? '';
  const editStudentId = searchParams.get('studentId') ?? '';
  const editMonthKey = searchParams.get('monthKey') ?? '';
  const editAmount = searchParams.get('amount') ?? '';
  const editNotes = searchParams.get('notes') ?? '';

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [studentId, setStudentId] = useState(isEditMode ? editStudentId : '');
  const [monthKey, setMonthKey] = useState(isEditMode ? editMonthKey : currentMonth);
  const [amount, setAmount] = useState(isEditMode ? editAmount : '');
  const [notes, setNotes] = useState(isEditMode ? editNotes : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [initialized, setInitialized] = useState(!isEditMode);

  // For edit mode, ensure monthKey is in options (it may be outside the default range)
  const extendedMonthOptions = useMemo(() => {
    if (!isEditMode || !editMonthKey) return monthOptions;
    const exists = monthOptions.some((opt) => opt.value === editMonthKey);
    if (exists) return monthOptions;
    const [year, month] = editMonthKey.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return [{ value: editMonthKey, label }, ...monthOptions];
  }, [isEditMode, editMonthKey, monthOptions]);

  // Initialize edit mode values once searchParams are read
  useEffect(() => {
    if (isEditMode && !initialized) {
      setStudentId(editStudentId);
      setMonthKey(editMonthKey || currentMonth);
      setAmount(editAmount);
      setNotes(decodeURIComponent(editNotes));
      setInitialized(true);
    }
  }, [isEditMode, initialized, editStudentId, editMonthKey, editAmount, editNotes, currentMonth]);

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: s.fullName })),
    [students],
  );

  const validate = useCallback(() => {
    if (!studentId) return 'Please select a student';
    if (!monthKey) return 'Please select a month';
    const numAmount = Number(amount);
    if (!amount || Number.isNaN(numAmount) || numAmount <= 0) return 'Please enter a valid amount';
    if (!Number.isInteger(numAmount)) return 'Amount must be a whole rupee value (no paise)';
    if (numAmount < 1 || numAmount > 1_000_000) return 'Amount must be between ₹1 and ₹10,00,000';
    return null;
  }, [studentId, monthKey, amount]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const url = isEditMode
        ? `/api/fees/payment-requests/${editRequestId}`
        : '/api/fees/payment-requests';

      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          isEditMode
            ? {
                action: 'update',
                studentId,
                monthKey,
                amount: Number(amount),
                notes: notes.trim() || undefined,
              }
            : {
                studentId,
                monthKey,
                amount: Number(amount),
                notes: notes.trim() || undefined,
              },
        ),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        let message = isEditMode ? 'Failed to update payment request' : 'Failed to submit payment request';
        try {
          const json = await res.json();
          if (json?.message) message = json.message;
        } catch { /* ignore parse error */ }
        throw new Error(message);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/fees?tab=my-requests');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [validate, accessToken, studentId, monthKey, amount, notes, router, isEditMode, editRequestId]);

  if (success) {
    return (
      <div className={styles.page}>
        <Alert variant="success" message={isEditMode ? 'Payment request updated successfully! Redirecting...' : 'Payment request submitted successfully! Redirecting...'} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push('/fees?tab=my-requests')}
          aria-label="Back to fees"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>{isEditMode ? 'Edit Payment Request' : 'New Payment Request'}</h1>
      </div>

      {error && <Alert variant="error" message={error} />}

      <form className={styles.form} onSubmit={handleSubmit}>
        {studentsLoading ? (
          <Spinner centered size="md" />
        ) : (
          <Select
            label="Student"
            required
            placeholder="Select a student"
            options={studentOptions}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={isEditMode}
          />
        )}

        <Select
          label="Month"
          required
          options={extendedMonthOptions}
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
        />

        <Input
          label="Amount"
          required
          type="number"
          min="1"
          step="1"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <TextArea
          label="Notes"
          placeholder="Add any notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          showCharCount
        />

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/fees?tab=my-requests')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting}
          >
            {isEditMode ? 'Update Request' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
