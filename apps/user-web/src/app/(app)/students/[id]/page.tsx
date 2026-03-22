'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudentDetail, deleteStudent } from '@/application/students/use-students';
import { useAuth } from '@/application/auth/use-auth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from './page.module.css';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function statusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'success' as const;
    case 'inactive': return 'warning' as const;
    case 'left': return 'danger' as const;
    default: return 'default' as const;
  }
}

/** Format a YYYY-MM-DD string without timezone shift. */
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatAddress(addr: unknown): string | null {
  if (!addr || typeof addr !== 'object') return typeof addr === 'string' ? addr : null;
  const a = addr as Record<string, string | null>;
  const parts = [a['line1'], a['line2'], a['city'], a['state'], a['pincode']].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { data: student, loading, error, refetch } = useStudentDetail(params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = user?.role === 'OWNER' || user?.role === 'STAFF';
  const canDelete = user?.role === 'OWNER';

  const handleDelete = useCallback(async () => {
    if (!params.id) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteStudent(params.id, accessToken);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error || 'Failed to delete student');
      return;
    }
    setDeleteOpen(false);
    router.push('/students');
  }, [params.id, accessToken, router]);

  if (loading) return <Spinner centered size="lg" />;
  if (error) return (
    <div className={styles.page}>
      <Alert variant="error" message={error} />
      <div className={styles.errorActions}>
        <Button onClick={refetch}>Retry</Button>
        <Button variant="secondary" onClick={() => router.push('/students')}>Back to Students</Button>
      </div>
    </div>
  );
  if (!student) return (
    <div className={styles.page}>
      <Alert variant="error" message="Student not found" />
      <Button variant="secondary" onClick={() => router.push('/students')} style={{ marginTop: 16 }}>
        Back to Students
      </Button>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Back */}
      <button type="button" className={styles.backButton} onClick={() => router.push('/students')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Students
      </button>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <Avatar src={student.profilePhotoUrl} name={student.fullName} size="xl" />
        <div className={styles.profileInfo}>
          <h1 className={styles.profileName}>{student.fullName}</h1>
          <div className={styles.profileMeta}>
            <Badge variant={statusBadgeVariant(student.status)} dot>
              {student.status}
            </Badge>
            <span>{titleCase(student.gender)}</span>
            {student.mobileNumber && <span>{student.mobileNumber}</span>}
          </div>
        </div>
        <div className={styles.profileActions}>
          {canEdit && (
            <Button variant="outline" onClick={() => router.push(`/students/${params.id}/edit`)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className={styles.infoGrid}>
        {/* Personal Info */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoCardTitle}>Personal Information</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Date of Birth</span>
            <span className={styles.infoValue}>{student.dateOfBirth ? formatDate(student.dateOfBirth) : '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Gender</span>
            <span className={styles.infoValue}>{student.gender ? titleCase(student.gender) : '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Joining Date</span>
            <span className={styles.infoValue}>{student.joiningDate ? formatDate(student.joiningDate) : '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Monthly Fee</span>
            <span className={styles.infoValue}>{currencyFormatter.format(student.monthlyFee)}</span>
          </div>
          {formatAddress(student.address) && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Address</span>
              <span className={styles.infoValue}>{formatAddress(student.address)}</span>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoCardTitle}>Contact Information</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Phone</span>
            <span className={styles.infoValue}>{student.mobileNumber || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{student.email || '-'}</span>
          </div>
        </div>

        {/* Guardian Info */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoCardTitle}>Guardian Information</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Name</span>
            <span className={styles.infoValue}>{student.guardian?.name || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Mobile</span>
            <span className={styles.infoValue}>{student.guardian?.mobile || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{student.guardian?.email || '-'}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete "${student.fullName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      >
        {deleteError && <Alert variant="error" message={deleteError} />}
      </ConfirmDialog>
    </div>
  );
}
