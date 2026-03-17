'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

type AuditLog = {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
};

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
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/audit-logs?${params}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const json = await res.json();
      setLogs(json.data ?? json.items ?? []);
      setTotalPages(json.meta?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, actionFilter, entityFilter, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Audit Logs</h1>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.dateRange}>
          <DatePicker value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          <span className={styles.dateRangeLabel}>to</span>
          <DatePicker value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
        </div>
        <Select options={ACTION_OPTIONS} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} />
        <Select options={ENTITY_OPTIONS} value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }} />
      </div>

      {/* Error */}
      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: fetchLogs }} />}

      {/* Table */}
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
                  <Td>{new Date(log.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Td>
                  <Td style={{ fontWeight: 500 }}>{log.actorName}</Td>
                  <Td>
                    <span className={`${styles.actionBadge} ${getActionClass(log.action)}`}>
                      {log.action}
                    </span>
                  </Td>
                  <Td>{log.entityType}</Td>
                  <Td><span className={styles.detailsText}>{log.details ?? '-'}</span></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
