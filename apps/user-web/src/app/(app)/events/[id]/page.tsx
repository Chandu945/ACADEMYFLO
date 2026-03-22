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
import styles from './page.module.css';

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'UPCOMING': return 'info' as const;
    case 'ONGOING': return 'primary' as const;
    case 'COMPLETED': return 'success' as const;
    case 'CANCELLED': return 'danger' as const;
    default: return 'default' as const;
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: event, loading, error, refetch } = useEventDetail(params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteEvent(params.id, accessToken);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error || 'Failed to delete event');
      return;
    }
    setDeleteOpen(false);
    router.push('/events');
  }, [params.id, accessToken, router]);

  if (loading) return <Spinner centered size="lg" />;
  if (error) return (
    <div className={styles.page}>
      <Alert variant="error" message={error} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <Button onClick={refetch}>Retry</Button>
        <Button variant="secondary" onClick={() => router.push('/events')}>Back to Events</Button>
      </div>
    </div>
  );
  if (!event) return (
    <div className={styles.page}>
      <Alert variant="error" message="Event not found" />
      <Button variant="secondary" onClick={() => router.push('/events')} style={{ marginTop: 16 }}>Back to Events</Button>
    </div>
  );

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => router.push('/events')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Events
      </button>

      <Card>
        <div className={styles.detailHeader}>
          <div>
            <h1 className={styles.eventTitle}>{event.title}</h1>
            <div className={styles.badgeRow}>
              <Badge variant={statusBadgeVariant(event.status)}>{event.status}</Badge>
              {event.eventType && <Badge variant="primary">{event.eventType}</Badge>}
              {event.isAllDay && <Badge variant="info">All Day</Badge>}
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {event.description && (
            <div>
              <h4 className={styles.infoLabel}>Description</h4>
              <p className={styles.infoValue}>{event.description}</p>
            </div>
          )}

          <div className={styles.infoGrid}>
            <div>
              <h4 className={styles.infoLabel}>Start Date</h4>
              <p className={styles.infoValue}>{formatDate(event.startDate)}</p>
            </div>
            {event.endDate && (
              <div>
                <h4 className={styles.infoLabel}>End Date</h4>
                <p className={styles.infoValue}>{formatDate(event.endDate)}</p>
              </div>
            )}
            {event.startTime && (
              <div>
                <h4 className={styles.infoLabel}>Time</h4>
                <p className={styles.infoValue}>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</p>
              </div>
            )}
            {event.location && (
              <div>
                <h4 className={styles.infoLabel}>Location</h4>
                <p className={styles.infoValue}>{event.location}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${event.title}"?`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      >
        {deleteError && <Alert variant="error" message={deleteError} />}
      </ConfirmDialog>
    </div>
  );
}
