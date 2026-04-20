'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent } from '@/application/events/use-events';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

const EVENT_TYPES = [
  { value: '', label: 'Select Type' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'DEMO_CLASS', label: 'Demo Class' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'ANNUAL_DAY', label: 'Annual Day' },
  { value: 'TRAINING_CAMP', label: 'Training Camp' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewEventPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: '',
    startDate: new Date().toISOString().split('T')[0]!,
    endDate: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    location: '',
  });

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  const isDirty = form.title || form.description || form.eventType || form.endDate || form.startTime || form.endTime || form.location;

  useEffect(() => {
    if (!isDirty || success) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, success]);

  const set = useCallback((field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (typeof value === 'string') {
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const n = { ...prev }; delete n[field]; return n;
      });
    }
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors['title'] = 'Title is required';
    if (!form.startDate) errors['startDate'] = 'Start date is required';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors['endDate'] = 'End date must be after start date';
    }
    // For non-all-day events, require start time and ensure end > start
    // when both are on the same day. Mirrors the API rule so the user gets
    // immediate feedback instead of round-tripping for a 400.
    if (!form.isAllDay) {
      if (!form.startTime) errors['startTime'] = 'Start time is required';
      if (form.startTime && form.endTime) {
        const sameDay = !form.endDate || form.endDate === form.startDate;
        if (sameDay && form.endTime <= form.startTime) {
          errors['endTime'] = 'End time must be after start time';
        }
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  // Defense-in-depth dedup: setLoading is async, so a fast double-submit
  // (Enter + click) can fire two POSTs and create two events.
  const submitInflightRef = useRef(false);
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInflightRef.current) return;
    setError(null);
    setFieldErrors({});
    if (!validate()) return;

    submitInflightRef.current = true;
    setLoading(true);
    let result;
    try {
      result = await createEvent(
        {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          eventType: form.eventType || undefined,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          startTime: form.isAllDay ? undefined : form.startTime || undefined,
          endTime: form.isAllDay ? undefined : form.endTime || undefined,
          isAllDay: form.isAllDay,
          location: form.location.trim() || undefined,
        },
        accessToken,
      );
    } finally {
      submitInflightRef.current = false;
      setLoading(false);
    }

    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    setSuccess(true);
    redirectTimer.current = setTimeout(() => router.push('/events'), 1200);
  }, [form, accessToken, router, validate]);

  return (
    <div className={styles.page}>
      <button type="button" onClick={() => router.push('/events')} className={styles.backButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Events
      </button>

      <Card title="Create Event">
        {success && <Alert variant="success" message="Event created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} error={fieldErrors['title']} placeholder="Event title" />
          <Input label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Event description (optional)" />
          <Select label="Event Type" options={EVENT_TYPES} value={form.eventType} onChange={(e) => set('eventType', e.target.value)} />

          <div className={styles.gridRow}>
            <DatePicker label="Start Date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} error={fieldErrors['startDate']} />
            <DatePicker label="End Date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} error={fieldErrors['endDate']} />
          </div>

          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={form.isAllDay} onChange={(e) => set('isAllDay', e.target.checked)} className={styles.checkbox} />
            All Day Event
          </label>

          {!form.isAllDay && (
            <div className={styles.gridRow}>
              <Input label="Start Time" type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              <Input label="End Time" type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
            </div>
          )}

          <Input label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Event location (optional)" />

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => router.push('/events')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Create Event</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
