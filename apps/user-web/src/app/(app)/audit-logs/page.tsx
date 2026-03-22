'use client';

import React, { useState } from 'react';
import { useAuditLogs } from '@/application/audit-logs/use-audit-logs';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'BATCH', label: 'Batch' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'FEE', label: 'Fee' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'EVENT', label: 'Event' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'ENQUIRY', label: 'Enquiry' },
];

function getActionClass(action: string) {
  switch (action.toUpperCase()) {
    case 'CREATE': return styles.create;
    case 'UPDATE': return styles.update;
    case 'DELETE': return styles.delete;
    default: return styles.other;
  }
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: logs, meta, loading, error, refetch } = useAuditLogs({
    page,
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
    from: startDate || undefined,
    to: endDate || undefined,
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Audit Logs</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.dateRange}>
          <DatePicker value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          <span className={styles.dateRangeLabel}>to</span>
          <DatePicker value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
        </div>
        <Select options={ACTION_OPTIONS} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} />
        <Select options={ENTITY_OPTIONS} value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }} />
      </div>

      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: refetch }} />}

      {loading ? (
        <Spinner centered size="lg" />
      ) : logs.length === 0 ? (
        <EmptyState message="No audit logs found" subtitle="Try adjusting your filters" />
      ) : (
        <>
          <Table striped compact>
            <Thead>
              <Tr>
                <Th>Date/Time</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Details</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log) => (
                <Tr key={log.id}>
                  <Td>{new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</Td>
                  <Td><span className={styles.actorName}>{log.actorName ?? '-'}</span></Td>
                  <Td>
                    <span className={`${styles.actionBadge} ${getActionClass(log.action)}`}>
                      {log.action}
                    </span>
                  </Td>
                  <Td>{log.entityType}</Td>
                  <Td><span className={styles.detailsText}>{log.context ? JSON.stringify(log.context) : '-'}</span></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {meta && meta.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={meta.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
