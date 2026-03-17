'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEventDetail, deleteEvent } from '@/application/events/use-events';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'UPCOMING': return 'info' as const;
    case 'ONGOING': return 'primary' as const;
    case 'COMPLETED': return 'success' as const;
    case 'CANCELLED': return 'danger' as const;
    default: return 'default' as const;
  }
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: event, loading } = useEventDetail(params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    const result = await deleteEvent(params.id, accessToken);
    setDeleting(false);
    if (result.ok) router.push('/events');
  }, [params.id, accessToken, router]);

  if (loading) return <Spinner centered size="lg" />;
  if (!event) return <Alert variant="error" message="Event not found" />;

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px' }}>
      <button
        onClick={() => router.push('/events')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: '24px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Events
      </button>

      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text)' }}>{event.title}</h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Badge variant={statusBadgeVariant(event.status)}>{event.status}</Badge>
              {event.eventType && <Badge variant="primary">{event.eventType}</Badge>}
              {event.isAllDay && <Badge variant="info">All Day</Badge>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => router.push(`/events/new?edit=${params.id}`)}>Edit</Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {event.description && (
            <div>
              <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px', fontSize: 'var(--text-sm)' }}>Description</h4>
              <p style={{ color: 'var(--color-text)' }}>{event.description}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px', fontSize: 'var(--text-sm)' }}>Start Date</h4>
              <p style={{ fontWeight: 500 }}>{new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            {event.endDate && (
              <div>
                <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px', fontSize: 'var(--text-sm)' }}>End Date</h4>
                <p style={{ fontWeight: 500 }}>{new Date(event.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            )}
            {event.startTime && (
              <div>
                <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px', fontSize: 'var(--text-sm)' }}>Time</h4>
                <p style={{ fontWeight: 500 }}>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</p>
              </div>
            )}
            {event.location && (
              <div>
                <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px', fontSize: 'var(--text-sm)' }}>Location</h4>
                <p style={{ fontWeight: 500 }}>{event.location}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${event.title}"?`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
