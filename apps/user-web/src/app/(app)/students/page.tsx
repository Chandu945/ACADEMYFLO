'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudents } from '@/application/students/use-students';
import { useBatches } from '@/application/batches/use-batches';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

const STATUS_FILTERS = ['All', 'Active', 'Inactive', 'Left'] as const;
const FEE_FILTERS = [
  { value: '', label: 'All Fees' },
  { value: 'DUE', label: 'Due' },
  { value: 'PAID', label: 'Paid' },
];

function statusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'success' as const;
    case 'inactive': return 'warning' as const;
    case 'left': return 'danger' as const;
    default: return 'default' as const;
  }
}

export default function StudentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [feeFilter, setFeeFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: students, meta, loading, error, refetch } = useStudents({
    page,
    pageSize: 20,
    search: search || undefined,
    status: statusFilter === 'All' ? undefined : statusFilter.toUpperCase(),
    feeFilter: feeFilter || undefined,
    batchId: batchFilter || undefined,
  });

  const { data: batches } = useBatches();

  const batchOptions = [
    { value: '', label: 'All Batches' },
    ...batches.map((b) => ({ value: b.id, label: b.batchName })),
  ];

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Students</h1>
        <Button variant="primary" onClick={() => router.push('/students/new')}>
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search students..."
        />
        <div className={styles.chipGroup}>
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={statusFilter === s}
              onSelect={() => handleStatusChange(s)}
            />
          ))}
        </div>
        <Select
          options={FEE_FILTERS}
          value={feeFilter}
          onChange={(e) => { setFeeFilter(e.target.value); setPage(1); }}
          placeholder="Fee Status"
        />
        <Select
          options={batchOptions}
          value={batchFilter}
          onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }}
          placeholder="Batch"
        />
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error" message={error} action={{ label: 'Retry', onClick: refetch }} />
      )}

      {/* Loading */}
      {loading && !students.length ? (
        <Spinner centered size="lg" />
      ) : students.length === 0 ? (
        <EmptyState
          message="No students found"
          subtitle={search ? 'Try adjusting your search or filters' : 'Add your first student to get started'}
          action={!search ? <Button variant="primary" onClick={() => router.push('/students/new')}>Add Student</Button> : undefined}
        />
      ) : (
        <>
          <Table striped>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Guardian</Th>
                <Th>Monthly Fee</Th>
                <Th>Joined</Th>
              </Tr>
            </Thead>
            <Tbody>
              {students.map((student) => (
                <Tr
                  key={student.id}
                  clickable
                  onClick={() => router.push(`/students/${student.id}`)}
                >
                  <Td>
                    <div className={styles.avatarCell}>
                      <Avatar src={student.profilePhotoUrl} name={student.fullName} size="sm" />
                      <span className={styles.studentName}>{student.fullName}</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={statusBadgeVariant(student.status)} dot>
                      {student.status}
                    </Badge>
                  </Td>
                  <Td>{student.guardian?.name ?? '-'}</Td>
                  <Td>
                    <span className={styles.feeText}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(student.monthlyFee)}
                    </span>
                  </Td>
                  <Td>{new Date(student.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {meta && meta.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
