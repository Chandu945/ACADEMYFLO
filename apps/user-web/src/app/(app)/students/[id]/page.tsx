'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useStudentDetail, deleteStudent, updateStudent, inviteParent } from '@/application/students/use-students';
import { useAuth } from '@/application/auth/use-auth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/TextArea';
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

function getStatusOptions(currentStatus: string): { value: string; label: string }[] {
  const upper = currentStatus.toUpperCase();
  if (upper === 'ACTIVE') {
    return [
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'LEFT', label: 'Left' },
    ];
  }
  return [{ value: 'ACTIVE', label: 'Active' }];
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { data: student, loading, error, refetch } = useStudentDetail(params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Status change state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  // Invite parent state
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ parentEmail: string; tempPassword: string; isExistingUser: boolean } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canEdit = user?.role === 'OWNER' || user?.role === 'STAFF';
  const canDelete = user?.role === 'OWNER';
  const canChangeStatus = user?.role === 'OWNER';
  const canInvite = user?.role === 'OWNER';

  const openStatusModal = useCallback(() => {
    if (!student) return;
    const options = getStatusOptions(student.status);
    setNewStatus(options[0]?.value ?? '');
    setStatusReason('');
    setStatusError(null);
    setStatusSuccess(null);
    setStatusModalOpen(true);
  }, [student]);

  const handleStatusChange = useCallback(async () => {
    if (!params.id || !newStatus) return;
    setStatusChanging(true);
    setStatusError(null);
    const result = await updateStudent(
      params.id,
      { status: newStatus, statusChangeReason: statusReason.trim() || undefined },
      accessToken,
    );
    setStatusChanging(false);
    if (!result.ok) {
      setStatusError(result.error || 'Failed to change status');
      return;
    }
    setStatusModalOpen(false);
    setStatusSuccess('Status changed successfully');
    refetch();
    setTimeout(() => setStatusSuccess(null), 3000);
  }, [params.id, newStatus, statusReason, accessToken, refetch]);

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

  const handleInviteParent = useCallback(async () => {
    if (!params.id) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteResult(null);
    const result = await inviteParent(params.id, accessToken);
    setInviteLoading(false);
    if (!result.ok) {
      setInviteError(result.error);
      return;
    }
    setInviteResult({
      parentEmail: result.data.parentEmail,
      tempPassword: result.data.tempPassword,
      isExistingUser: result.data.isExistingUser,
    });
  }, [params.id, accessToken]);

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

  const guardianMobile = student.guardian?.mobile;

  return (
    <div className={styles.page}>
      {/* Back */}
      <button type="button" className={styles.backButton} onClick={() => router.push('/students')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Students
      </button>

      {statusSuccess && <Alert variant="success" message={statusSuccess} />}
      {inviteError && <Alert variant="error" message={inviteError} onDismiss={() => setInviteError(null)} />}
      {inviteResult && (
        <Alert
          variant="success"
          message={
            inviteResult.isExistingUser
              ? `Parent account (${inviteResult.parentEmail}) has been linked to this student.`
              : `Parent invited! Email: ${inviteResult.parentEmail}, Temporary Password: ${inviteResult.tempPassword}`
          }
          onDismiss={() => setInviteResult(null)}
        />
      )}

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
          <Link href={`/students/${params.id}/fees`}>
            <Button variant="secondary">View Fee Details</Button>
          </Link>
          {canInvite && (
            <Button variant="outline" onClick={handleInviteParent} loading={inviteLoading}>
              Invite Parent
            </Button>
          )}
          {canChangeStatus && (
            <Button variant="outline" onClick={openStatusModal}>
              Change Status
            </Button>
          )}
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

        {/* Family Info */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoCardTitle}>Family Information</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Father Name</span>
            <span className={styles.infoValue}>{student.fatherName || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Mother Name</span>
            <span className={styles.infoValue}>{student.motherName || '-'}</span>
          </div>
        </div>

        {/* Contact Info */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoCardTitle}>Contact Information</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Mobile Number</span>
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
            <span className={styles.infoValue}>
              {guardianMobile ? (
                <a href={`tel:${guardianMobile}`} className={styles.contactLink}>
                  {guardianMobile}
                </a>
              ) : '-'}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{student.guardian?.email || '-'}</span>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change Student Status"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setStatusModalOpen(false)} disabled={statusChanging}>
              Cancel
            </Button>
            <Button variant="primary" loading={statusChanging} onClick={handleStatusChange}>
              Confirm
            </Button>
          </div>
        }
      >
        <div className={styles.statusModalBody}>
          {statusError && <Alert variant="error" message={statusError} />}
          <div className={styles.currentStatus}>
            <span className={styles.statusLabel}>Current Status:</span>
            <Badge variant={statusBadgeVariant(student.status)} dot>
              {student.status}
            </Badge>
          </div>
          <div className={styles.statusOptions}>
            <span className={styles.statusLabel}>Change to:</span>
            {getStatusOptions(student.status).map((opt) => (
              <label key={opt.value} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="newStatus"
                  value={opt.value}
                  checked={newStatus === opt.value}
                  onChange={() => setNewStatus(opt.value)}
                  className={styles.radioInput}
                />
                <Badge variant={statusBadgeVariant(opt.value)}>{opt.label}</Badge>
              </label>
            ))}
          </div>
          <TextArea
            label="Reason (optional)"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            maxLength={500}
            showCharCount
            placeholder="Enter reason for status change..."
            rows={3}
          />
        </div>
      </Modal>

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
