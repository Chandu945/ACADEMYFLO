'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBatch } from '@/application/batches/use-batches';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function NewBatchPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    batchName: '',
    days: [] as string[],
    startTime: '',
    endTime: '',
    maxStudents: '',
    notes: '',
  });

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.batchName.trim()) errors.batchName = 'Batch name is required';
    if (form.days.length === 0) errors.days = 'Select at least one day';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/batches'), 1200);
  }, [form, accessToken, router]);

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '680px' }}>
      <button
        onClick={() => router.push('/batches')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: '24px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Batches
      </button>

      <Card title="Create New Batch">
        {success && <Alert variant="success" message="Batch created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Input
            label="Batch Name"
            required
            value={form.batchName}
            onChange={(e) => setForm((p) => ({ ...p, batchName: e.target.value }))}
            error={fieldErrors.batchName}
            placeholder="e.g. Morning Batch, Advanced Group"
          />

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-medium)' }}>
              Days of Week <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {WEEKDAYS.map((day) => (
                <label
                  key={day}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    borderRadius: 'var(--radius-md)', border: '1px solid',
                    borderColor: form.days.includes(day) ? 'var(--color-primary)' : 'var(--color-border)',
                    background: form.days.includes(day) ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                    cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500,
                    color: form.days.includes(day) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input type="checkbox" checked={form.days.includes(day)} onChange={() => toggleDay(day)} style={{ display: 'none' }} />
                  {day}
                </label>
              ))}
            </div>
            {fieldErrors.days && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>{fieldErrors.days}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input label="Start Time" type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
            <Input label="End Time" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
          </div>

          <Input
            label="Max Students"
            type="number"
            value={form.maxStudents}
            onChange={(e) => setForm((p) => ({ ...p, maxStudents: e.target.value }))}
            placeholder="Maximum capacity (optional)"
          />

          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Any notes about this batch (optional)"
          />

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <Button type="button" variant="outline" onClick={() => router.push('/batches')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Create Batch</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
