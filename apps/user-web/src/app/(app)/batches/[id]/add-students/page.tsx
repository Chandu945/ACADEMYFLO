'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudents } from '@/application/students/use-students';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import styles from './page.module.css';

export default function AddStudentsToBatchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch all students (not filtered by batch)
  const { data: allStudents, loading: allLoading, error: allError } = useStudents({ pageSize: 200 });

  // Fetch students already in this batch
  const { data: batchStudents, loading: batchLoading } = useStudents({ batchId: params.id, pageSize: 200 });

  const loading = allLoading || batchLoading;

  // Exclude students already in this batch
  const availableStudents = useMemo(() => {
    const batchStudentIds = new Set(batchStudents.map((s) => s.id));
    return allStudents.filter((s) => !batchStudentIds.has(s.id));
  }, [allStudents, batchStudents]);

  // Filter by search
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return availableStudents;
    const q = search.toLowerCase();
    return availableStudents.filter((s) => s.fullName.toLowerCase().includes(q));
  }, [availableStudents, search]);

  const toggleStudent = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/batches/${params.id}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ studentIds: Array.from(selectedIds) }),
        signal: AbortSignal.timeout(30000),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitError((json?.message as string) || 'Failed to add students');
        setSubmitting(false);
        return;
      }

      router.push(`/batches/${params.id}`);
    } catch {
      setSubmitError('Network error. Please try again.');
      setSubmitting(false);
    }
  }, [selectedIds, params.id, accessToken, router]);

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => router.push(`/batches/${params.id}`)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Batch
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>Add Students to Batch</h1>
      </div>

      {allError && <Alert variant="error" message={allError} />}
      {submitError && <Alert variant="error" message={submitError} onDismiss={() => setSubmitError(null)} />}

      <div className={styles.searchRow}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search students..." />
        <span className={styles.selectedCount}>
          {selectedIds.size} selected
        </span>
      </div>

      {loading ? (
        <Spinner centered size="lg" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          message="No students available"
          subtitle={search ? 'Try a different search term.' : 'All students are already in this batch.'}
        />
      ) : (
        <div className={styles.studentList}>
          {filteredStudents.map((student) => {
            const isSelected = selectedIds.has(student.id);
            return (
              <label
                key={student.id}
                className={`${styles.studentItem} ${isSelected ? styles.studentItemSelected : ''}`}
              >
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isSelected}
                  onChange={() => toggleStudent(student.id)}
                />
                <Avatar src={student.profilePhotoUrl} name={student.fullName} size="sm" />
                <div className={styles.studentInfo}>
                  <span className={styles.studentName}>{student.fullName}</span>
                  {student.guardian && (
                    <span className={styles.studentMeta}>Guardian: {student.guardian.name}</span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className={styles.footer}>
          <Button
            variant="primary"
            loading={submitting}
            onClick={handleAddSelected}
          >
            Add {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
