'use client';

import { ConfirmDialog } from './ConfirmDialog';

type ForceLogoutModalProps = {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ForceLogoutModal({ open, loading, onConfirm, onCancel }: ForceLogoutModalProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Force Logout All Users"
      message="This will immediately invalidate all active sessions for this academy. The owner and all staff members will be forced to log in again. This action cannot be undone."
      confirmLabel="Force Logout"
      confirmVariant="danger"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
