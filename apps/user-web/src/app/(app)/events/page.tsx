'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEvents } from '@/application/events/use-events';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import styles from './page.module.css';

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'DEMO_CLASS', label: 'Demo Class' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'ANNUAL_DAY', label: 'Annual Day' },
  { value: 'TRAINING_CAMP', label: 'Training Camp' },
  { value: 'OTHER', label: 'Other' },
];

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'UPCOMING': return 'info' as const;
    case 'ONGOING': return 'primary' as const;
    case 'COMPLETED': return 'success' as const;
    case 'CANCELLED': return 'danger' as const;
    default: return 'default' as const;
  }
}

export default function EventsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events, loading, error, refetch } = useEvents({
    status: statusFilter || undefined,
    eventType: typeFilter || undefined,
  });

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.trim().toLowerCase();
    return events.filter((event) => event.title.toLowerCase().includes(q));
  }, [events, searchQuery]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <Button variant="primary" onClick={() => router.push('/events/new')}>Add Event</Button>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search events by title..."
        label="Search events"
        debounceMs={200}
      />

      <div className={styles.filters}>
        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        <Select options={TYPE_OPTIONS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
      </div>

      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: refetch }} />}

      {loading ? (
        <Spinner centered size="lg" />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          message={searchQuery.trim() ? 'No matching events' : 'No events found'}
          subtitle={searchQuery.trim() ? 'Try a different search term' : 'Create an event to share with your academy'}
          action={!searchQuery.trim() ? <Button variant="primary" onClick={() => router.push('/events/new')}>Add Event</Button> : undefined}
        />
      ) : (
        <div className={styles.cardGrid}>
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className={styles.eventCard}
              onClick={() => router.push(`/events/${event.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/events/${event.id}`)}
            >
              <div className={styles.eventHeader}>
                <span className={styles.eventTitle}>{event.title}</span>
                <Badge variant={statusBadgeVariant(event.status)}>{event.status}</Badge>
              </div>
              <div className={styles.eventMeta}>
                {event.eventType && (
                  <div className={styles.eventMetaRow}>
                    <Badge variant="primary">{event.eventType}</Badge>
                  </div>
                )}
                <div className={styles.eventMetaRow}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  <span>
                    {formatDate(event.startDate)}
                    {event.endDate && event.endDate !== event.startDate && ` - ${formatDate(event.endDate)}`}
                  </span>
                </div>
                {event.location && (
                  <div className={styles.eventMetaRow}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
