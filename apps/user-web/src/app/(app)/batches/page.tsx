'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBatches } from '@/application/batches/use-batches';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

export default function BatchesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: batches, loading, error, refetch } = useBatches(search || undefined);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Batches</h1>
        <Button variant="primary" onClick={() => router.push('/batches/new')}>
          Add Batch
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search batches..."
      />

      {/* Error */}
      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: refetch }} />}

      {/* Loading */}
      {loading ? (
        <Spinner centered size="lg" />
      ) : batches.length === 0 ? (
        <EmptyState
          message="No batches found"
          subtitle={search ? 'Try a different search term' : 'Create your first batch to organize students'}
          action={!search ? <Button variant="primary" onClick={() => router.push('/batches/new')}>Add Batch</Button> : undefined}
        />
      ) : (
        <div className={styles.cardGrid}>
          {batches.map((batch) => (
            <div
              key={batch.id}
              className={styles.batchCard}
              onClick={() => router.push(`/batches/${batch.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/batches/${batch.id}`)}
            >
              <div className={styles.batchHeader}>
                <span className={styles.batchName}>{batch.batchName}</span>
                <Badge variant={batch.status === 'ACTIVE' ? 'success' : 'default'} dot>
                  {batch.status}
                </Badge>
              </div>
              <div className={styles.batchMeta}>
                <div className={styles.batchDays}>
                  {batch.days.map((day) => (
                    <span key={day} className={styles.dayChip}>{day.slice(0, 3)}</span>
                  ))}
                </div>
                <div className={styles.batchInfoRow}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  <span>{batch.studentCount} student{batch.studentCount !== 1 ? 's' : ''}</span>
                </div>
                {(batch.startTime || batch.endTime) && (
                  <div className={styles.batchInfoRow}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    <span>{batch.startTime ?? ''} {batch.startTime && batch.endTime ? '-' : ''} {batch.endTime ?? ''}</span>
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
