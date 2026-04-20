'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStaff, toggleStaffStatus } from '@/application/staff/use-staff';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from './page.module.css';

export default function StaffPage() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const { data: staff, setData: setStaff, loading, error, refetch } = useStaff();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; currentStatus: string; name: string } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const handleToggleStatus = useCallback((id: string, currentStatus: string, name: string) => {
    setConfirmTarget({ id, currentStatus, name });
    setConfirmOpen(true);
  }, []);

  const toggleInflightRef = useRef(false);
  const handleConfirmToggle = useCallback(async () => {
    if (!confirmTarget) return;
    if (toggleInflightRef.current) return;
    toggleInflightRef.current = true;
    setToggling(true);
    setToggleError(null);
    const newStatus = confirmTarget.currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    // Optimistic update — flip the row's status in the cached list before the
    // network round-trip so the UI reflects the user's intent immediately.
    const targetId = confirmTarget.id;
    const previousStatus = confirmTarget.currentStatus;
    setStaff((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, status: newStatus } : s)),
    );
    try {
      const result = await toggleStaffStatus(targetId, newStatus, accessToken);
      if (!result.ok) {
        // Roll back the optimistic flip and surface the error.
        setStaff((prev) =>
          prev.map((s) => (s.id === targetId ? { ...s, status: previousStatus } : s)),
        );
        setToggleError(result.error || 'Failed to update staff status');
        return;
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
      // refetch() reconciles with server (e.g., updatedAt drifts) but the row
      // already shows the right status optimistically.
      refetch();
    } finally {
      toggleInflightRef.current = false;
      setToggling(false);
    }
  }, [confirmTarget, accessToken, refetch, setStaff]);

  if (!isOwner) {
    return (
      <div className={styles.page}>
        <Alert variant="warning" message="Only owners can manage staff" />
        <Button variant="secondary" onClick={() => router.push('/dashboard')} style={{ marginTop: 16 }}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Staff</h1>
        <Button variant="primary" onClick={() => router.push('/staff/new')}>
          Add Staff
        </Button>
      </div>

      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: refetch }} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spinner size="lg" />
          <p style={{ marginTop: 12, color: 'var(--text-muted, #64748b)' }}>Loading staff…</p>
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          message="No staff members"
          subtitle="Add staff to help manage your academy"
          action={<Button variant="primary" onClick={() => router.push('/staff/new')}>Add Staff</Button>}
        />
      ) : (
        <div className={styles.tableWrapper}>
          <Table striped>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {staff.map((member) => (
                <Tr key={member.id}>
                  <Td>
                    <div className={styles.avatarCell}>
                      <Avatar src={member.profilePhotoUrl} name={member.fullName} size="sm" />
                      <span className={styles.staffName}>{member.fullName}</span>
                    </div>
                  </Td>
                  <Td>{member.email}</Td>
                  <Td>{member.phoneNumber}</Td>
                  <Td>
                    <Badge variant="primary">{member.role}</Badge>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${member.status === 'ACTIVE' ? styles.active : ''}`}
                      onClick={() => handleToggleStatus(member.id, member.status, member.fullName)}
                      aria-label={`Toggle status for ${member.fullName}`}
                      title={member.status === 'ACTIVE' ? 'Active - click to deactivate' : 'Inactive - click to activate'}
                      role="switch"
                      aria-checked={member.status === 'ACTIVE'}
                    />
                  </Td>
                  <Td>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/staff/${member.id}/edit`)}>
                      Edit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); setToggleError(null); }}
        onConfirm={handleConfirmToggle}
        title={confirmTarget?.currentStatus === 'ACTIVE' ? 'Deactivate Staff' : 'Activate Staff'}
        message={confirmTarget?.currentStatus === 'ACTIVE' ? `Deactivate ${confirmTarget?.name ?? 'this staff member'}? They will be logged out immediately.` : `Are you sure you want to activate ${confirmTarget?.name ?? 'this staff member'}?`}
        confirmLabel={confirmTarget?.currentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        danger={confirmTarget?.currentStatus === 'ACTIVE'}
        loading={toggling}
      >
        {toggleError && <Alert variant="error" message={toggleError} />}
      </ConfirmDialog>
    </div>
  );
}
