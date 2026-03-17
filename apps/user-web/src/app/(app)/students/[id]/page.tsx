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

function statusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'success' as const;
    case 'inactive': return 'warning' as const;
    case 'left': return 'danger' as const;
    default: return 'default' as const;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: student, loading, error } = useStudentDetail(params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!params.id) return;
    setDeleting(true);
    const result = await deleteStudent(params.id, accessToken);
    setDeleting(false);
    if (result.ok) {
      router.push('/students');
    }
  }, [params.id, accessToken, router]);

  if (loading) return <Spinner centered size="lg" />;
  if (error) return <Alert variant="error" message={error} />;
  if (!student) return <Alert variant="error" message="Student not found" />;

  return (
    <div className={styles.page}>
      {/* Back */}
      <button className={styles.backButton} onClick={() => router.push('/students')}>
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
            <span>{student.gender}</span>
            {student.mobileNumber && <span>{student.mobileNumber}</span>}
          </div>
        </div>
        <div className={styles.profileActions}>
          <Button variant="outline" onClick={() => router.push(`/students/${params.id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
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
            <span className={styles.infoValue}>{student.gender || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Joining Date</span>
            <span className={styles.infoValue}>{student.joiningDate ? formatDate(student.joiningDate) : '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Monthly Fee</span>
            <span className={styles.infoValue}>{formatCurrency(student.monthlyFee)}</span>
          </div>
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
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete "${student.fullName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
