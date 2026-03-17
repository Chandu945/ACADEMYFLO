'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnquiries, useEnquirySummary } from '@/application/enquiries/use-enquiries';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './page.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CONVERTED', label: 'Converted' },
];

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'ACTIVE': return 'success' as const;
    case 'CLOSED': return 'default' as const;
    case 'CONVERTED': return 'primary' as const;
    default: return 'default' as const;
  }
}

export default function EnquiriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: enquiries, loading } = useEnquiries({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { data: summary, loading: summaryLoading } = useEnquirySummary();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Enquiries</h1>
        <Button variant="primary" onClick={() => router.push('/enquiries/new')}>Add Enquiry</Button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        {summaryLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={80} variant="rounded" />)
        ) : (
          <>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary?.total ?? 0}</div>
              <div className={styles.summaryLabel}>Total</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary?.active ?? 0}</div>
              <div className={styles.summaryLabel}>Active</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary?.closed ?? 0}</div>
              <div className={styles.summaryLabel}>Closed</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary?.todayFollowUp ?? 0}</div>
              <div className={styles.summaryLabel}>Today Follow-up</div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search enquiries..." />
        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <Spinner centered size="lg" />
      ) : enquiries.length === 0 ? (
        <EmptyState
          message="No enquiries found"
          subtitle={search ? 'Try a different search' : 'Add your first enquiry'}
          action={!search ? <Button variant="primary" onClick={() => router.push('/enquiries/new')}>Add Enquiry</Button> : undefined}
        />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Mobile</Th>
              <Th>Source</Th>
              <Th>Status</Th>
              <Th>Follow-up Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {enquiries.map((enq) => (
              <Tr key={enq.id} clickable onClick={() => router.push(`/enquiries/${enq.id}`)}>
                <Td style={{ fontWeight: 500 }}>{enq.prospectName}</Td>
                <Td>{enq.mobileNumber}</Td>
                <Td>{enq.source ?? '-'}</Td>
                <Td><Badge variant={statusBadgeVariant(enq.status)} dot>{enq.status}</Badge></Td>
                <Td>
                  {enq.nextFollowUpDate
                    ? new Date(enq.nextFollowUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-'}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
