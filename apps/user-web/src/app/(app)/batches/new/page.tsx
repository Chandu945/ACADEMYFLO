'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBatch } from '@/application/batches/use-batches';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

const WEEKDAYS = [
  { value: 'MON', label: 'Mon' },
  { value: 'TUE', label: 'Tue' },
  { value: 'WED', label: 'Wed' },
  { value: 'THU', label: 'Thu' },
  { value: 'FRI', label: 'Fri' },
  { value: 'SAT', label: 'Sat' },
  { value: 'SUN', label: 'Sun' },
];

export default function NewBatchPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [form, setForm] = useState({
    batchName: '',
    days: [] as string[],
    startTime: '',
    endTime: '',
    maxStudents: '',
    notes: '',
  });

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  const isDirty = form.batchName || form.days.length > 0 || form.startTime || form.endTime || form.maxStudents || form.notes;

  useEffect(() => {
    if (!isDirty || success) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, success]);

  const toggleDay = useCallback((day: string) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
    setFieldErrors((prev) => {
      if (!prev['days']) return prev;
      const n = { ...prev }; delete n['days']; return n;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.batchName.trim()) errors['batchName'] = 'Batch name is required';
    if (form.days.length === 0) errors['days'] = 'Select at least one day';
    if (form.maxStudents && (Number(form.maxStudents) < 1 || !Number.isInteger(Number(form.maxStudents)))) {
      errors['maxStudents'] = 'Must be a positive whole number';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!validate()) return;

    setLoading(true);
    const result = await createBatch(
      {
        batchName: form.batchName.trim(),
        days: form.days,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        maxStudents: form.maxStudents ? Number(form.maxStudents) : undefined,
        notes: form.notes.trim() || undefined,
      },
      accessToken,
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    setSuccess(true);
    redirectTimer.current = setTimeout(() => router.push('/batches'), 1200);
  }, [form, accessToken, router, validate]);

  return (
    <div className={styles.page}>
      <button type="button" onClick={() => router.push('/batches')} className={styles.backButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Batches
      </button>

      <Card title="Create New Batch">
        {success && <Alert variant="success" message="Batch created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input
            label="Batch Name"
            required
            value={form.batchName}
            onChange={(e) => { setForm((p) => ({ ...p, batchName: e.target.value })); setFieldErrors((p) => { if (!p['batchName']) return p; const n = { ...p }; delete n['batchName']; return n; }); }}
            error={fieldErrors['batchName']}
            placeholder="e.g. Morning Batch, Advanced Group"
          />

          <div>
            <label className={styles.fieldLabel}>
              Days of Week <span className={styles.required}>*</span>
            </label>
            <div className={styles.daysGrid}>
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  className={`${styles.dayButton} ${form.days.includes(day.value) ? styles.dayButtonSelected : ''}`}
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={form.days.includes(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {fieldErrors['days'] && <span className={styles.fieldError} role="alert">{fieldErrors['days']}</span>}
          </div>

          <div className={styles.gridRow}>
            <Input label="Start Time" type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
            <Input label="End Time" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
          </div>

          <Input
            label="Max Students"
            type="number"
            value={form.maxStudents}
            onChange={(e) => setForm((p) => ({ ...p, maxStudents: e.target.value }))}
            error={fieldErrors['maxStudents']}
            placeholder="Maximum capacity (optional)"
            min={1}
          />

          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Any notes about this batch (optional)"
          />

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => router.push('/batches')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Create Batch</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
