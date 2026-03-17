'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent } from '@/application/events/use-events';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const EVENT_TYPES = [
  { value: '', label: 'Select Type' },
  { value: 'EVENT', label: 'Event' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'EXAM', label: 'Exam' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewEventPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    location: '',
  });

  const set = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (typeof value === 'string') {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.startDate) errors.startDate = 'Start date is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const result = await createEvent(
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
    setTimeout(() => router.push('/events'), 1200);
  }, [form, accessToken, router]);

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '680px' }}>
      <button
        onClick={() => router.push('/events')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: '24px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Events
      </button>

      <Card title="Create Event">
        {success && <Alert variant="success" message="Event created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Input label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} error={fieldErrors.title} placeholder="Event title" />
          <Input label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Event description (optional)" />
          <Select label="Event Type" options={EVENT_TYPES} value={form.eventType} onChange={(e) => set('eventType', e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <DatePicker label="Start Date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} error={fieldErrors.startDate} />
            <DatePicker label="End Date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-base)', fontWeight: 500 }}>
            <input type="checkbox" checked={form.isAllDay} onChange={(e) => set('isAllDay', e.target.checked)} style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }} />
            All Day Event
          </label>

          {!form.isAllDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Input label="Start Time" type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              <Input label="End Time" type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
            </div>
          )}

          <Input label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Event location (optional)" />

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <Button type="button" variant="outline" onClick={() => router.push('/events')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading}>Create Event</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
