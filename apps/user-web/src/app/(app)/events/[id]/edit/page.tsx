'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEventDetail, updateEvent } from '@/application/events/use-events';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
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

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: event, loading: fetching } = useEventDetail(params.id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    location: '',
  });

  // Pre-populate form when event data loads
  useEffect(() => {
    if (event && !initialized) {
      setForm({
        title: event.title || '',
        description: event.description || '',
        eventType: event.eventType || '',
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        isAllDay: event.isAllDay || false,
        location: event.location || '',
      });
      setInitialized(true);
    }
  }, [event, initialized]);

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  const isDirty = initialized && event && (
    form.title !== (event.title || '') ||
    form.description !== (event.description || '') ||
    form.eventType !== (event.eventType || '') ||
    form.startDate !== (event.startDate || '') ||
    form.endDate !== (event.endDate || '') ||
    form.startTime !== (event.startTime || '') ||
    form.endTime !== (event.endTime || '') ||
    form.isAllDay !== (event.isAllDay || false) ||
    form.location !== (event.location || '')
  );

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
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!validate()) return;

    setLoading(true);
    const result = await updateEvent(
      params.id,
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
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    redirectTimer.current = setTimeout(() => router.push(`/events/${params.id}`), 1200);
  }, [form, accessToken, router, validate, params.id]);

  if (fetching) return <Spinner centered size="lg" />;
  if (!event) return <Alert variant="error" message="Event not found" />;

  return (
    <div className={styles.page}>
      <button type="button" onClick={() => router.push(`/events/${params.id}`)} className={styles.backButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Event
      </button>

      <Card title="Edit Event">
        {success && <Alert variant="success" message="Event updated successfully! Redirecting..." />}
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
            <Button type="button" variant="outline" onClick={() => router.push(`/events/${params.id}`)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
