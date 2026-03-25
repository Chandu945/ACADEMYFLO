'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBatchDetail, updateBatch, deleteBatch } from '@/application/batches/use-batches';
import { useStudents } from '@/application/students/use-students';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from './page.module.css';

const WEEKDAYS = [
  { value: 'MON', label: 'Mon' },
  { value: 'TUE', label: 'Tue' },
  { value: 'WED', label: 'Wed' },
  { value: 'THU', label: 'Thu' },
  { value: 'FRI', label: 'Fri' },
  { value: 'SAT', label: 'Sat' },
  { value: 'SUN', label: 'Sun' },
];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const { data: batch, loading, error, refetch } = useBatchDetail(params.id);

  const [studentSearch, setStudentSearch] = useState('');
  const { data: students, loading: studentsLoading, refetch: refetchStudents } = useStudents({ batchId: params.id, search: studentSearch || undefined, pageSize: 100 });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const [editForm, setEditForm] = useState({
    batchName: '',
    days: [] as string[],
    startTime: '',
    endTime: '',
    maxStudents: '',
    notes: '',
  });

  useEffect(() => {
    if (batch) {
      setEditForm({
        batchName: batch.batchName,
        days: batch.days,
        startTime: batch.startTime ?? '',
        endTime: batch.endTime ?? '',
        maxStudents: batch.maxStudents ? String(batch.maxStudents) : '',
        notes: batch.notes ?? '',
      });
    }
  }, [batch]);

  const toggleDay = (day: string) => {
    setEditForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const handleSaveEdit = useCallback(async () => {
    if (!editForm.batchName.trim()) { setEditError('Batch name is required'); return; }
    setSaving(true);
    setEditError(null);
    const result = await updateBatch(params.id, {
      batchName: editForm.batchName.trim(),
      days: editForm.days,
      startTime: editForm.startTime || undefined,
      endTime: editForm.endTime || undefined,
      maxStudents: editForm.maxStudents ? Number(editForm.maxStudents) : undefined,
      notes: editForm.notes.trim() || undefined,
    }, accessToken);
    setSaving(false);
    if (!result.ok) { setEditError(result.error); return; }
    setEditOpen(false);
    setEditSuccess(true);
    setTimeout(() => setEditSuccess(false), 3000);
    refetch();
  }, [editForm, params.id, accessToken, refetch]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteBatch(params.id, accessToken);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error || 'Failed to delete batch');
      return;
    }
    setDeleteOpen(false);
    router.push('/batches');
  }, [params.id, accessToken, router]);

  const handleRemoveStudent = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/batches/${params.id}/students/${removeTarget.id}`, {
        method: 'DELETE',
        headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      });
      if (!res.ok) {
        let msg = 'Failed to remove student';
        try { const json = await res.json(); msg = json.message || msg; } catch { /* */ }
        setRemoveError(msg);
        return;
      }
      setRemoveTarget(null);
      refetchStudents();
      refetch();
    } catch {
      setRemoveError('Network error');
    } finally {
      setRemoving(false);
    }
  }, [removeTarget, params.id, accessToken, refetchStudents, refetch]);

  if (loading) return <Spinner centered size="lg" />;
  if (error) return (
    <div className={styles.page}>
      <Alert variant="error" message={error} />
      <Button variant="secondary" onClick={() => router.push('/batches')} style={{ marginTop: 16 }}>Back to Batches</Button>
    </div>
  );
  if (!batch) return (
    <div className={styles.page}>
      <Alert variant="error" message="Batch not found" />
      <Button variant="secondary" onClick={() => router.push('/batches')} style={{ marginTop: 16 }}>Back to Batches</Button>
    </div>
  );

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => router.push('/batches')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Batches
      </button>

      {/* Detail Header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailInfo}>
          <h1 className={styles.batchName}>{batch.batchName}</h1>
          <div className={styles.metaRow}>
            <Badge variant={batch.status === 'ACTIVE' ? 'success' : 'default'} dot>{batch.status}</Badge>
            <span>{batch.studentCount}{batch.maxStudents ? ` / ${batch.maxStudents}` : ''} student{batch.studentCount !== 1 ? 's' : ''}</span>
            {batch.startTime && <span>{batch.startTime} - {batch.endTime}</span>}
          </div>
          <div className={styles.daysRow}>
            {batch.days.map((day) => (
              <span key={day} className={styles.dayChip}>{day}</span>
            ))}
          </div>
          {batch.notes && <p className={styles.batchNotes}>{batch.notes}</p>}
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => { setEditError(null); setEditOpen(true); }}>Edit</Button>
          {isOwner && <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>}
        </div>
      </div>

      {editSuccess && <Alert variant="success" message="Batch updated successfully" />}

      {/* Students Section */}
      <div className={styles.studentsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Students in Batch</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <SearchInput value={studentSearch} onChange={setStudentSearch} placeholder="Search students..." />
            <Button variant="primary" size="sm" onClick={() => router.push(`/batches/${params.id}/add-students`)}>Add Students</Button>
          </div>
        </div>

        {studentsLoading ? (
          <Spinner centered />
        ) : students.length === 0 ? (
          <EmptyState message="No students in this batch" subtitle="Add students to this batch" />
        ) : (
          <Table striped>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Monthly Fee</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {students.map((s) => (
                <Tr key={s.id} clickable onClick={() => router.push(`/students/${s.id}`)}>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar src={s.profilePhotoUrl} name={s.fullName} size="sm" />
                      <span style={{ fontWeight: 500 }}>{s.fullName}</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={s.status === 'ACTIVE' ? 'success' : 'warning'} dot>{s.status}</Badge>
                  </Td>
                  <Td>{currencyFormatter.format(s.monthlyFee)}</Td>
                  <Td>
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => setRemoveTarget({ id: s.id, name: s.fullName })}
                        aria-label={`Remove ${s.fullName} from batch`}
                        title="Remove from batch"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Batch" size="md">
        {editError && <Alert variant="error" message={editError} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
          <Input label="Batch Name" required value={editForm.batchName} onChange={(e) => setEditForm((p) => ({ ...p, batchName: e.target.value }))} />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-medium)' }}>Days</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={editForm.days.includes(day.value)}
                  style={{
                    padding: '4px 12px', borderRadius: '6px', cursor: 'pointer',
                    fontSize: 'var(--text-sm)', fontWeight: 500,
                    border: `1px solid ${editForm.days.includes(day.value) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: editForm.days.includes(day.value) ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                    color: editForm.days.includes(day.value) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input label="Start Time" type="time" value={editForm.startTime} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} />
            <Input label="End Time" type="time" value={editForm.endTime} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} />
          </div>
          <Input label="Max Students" type="number" value={editForm.maxStudents} onChange={(e) => setEditForm((p) => ({ ...p, maxStudents: e.target.value }))} />
          <Input label="Notes" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete Batch"
        message={`Are you sure you want to delete "${batch.batchName}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      >
        {deleteError && <Alert variant="error" message={deleteError} />}
      </ConfirmDialog>

      {/* Remove Student Confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => { setRemoveTarget(null); setRemoveError(null); }}
        onConfirm={handleRemoveStudent}
        title="Remove Student"
        message={`Remove "${removeTarget?.name ?? ''}" from this batch?`}
        confirmLabel="Remove"
        danger
        loading={removing}
      >
        {removeError && <Alert variant="error" message={removeError} />}
      </ConfirmDialog>
    </div>
  );
}
