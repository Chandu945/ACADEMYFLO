'use client';

import { ConfirmDialog } from './ConfirmDialog';

type DisableLoginModalProps = {
  open: boolean;
  loginDisabled: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DisableLoginModal({
  open,
  loginDisabled,
  loading,
  onConfirm,
  onCancel,
}: DisableLoginModalProps) {
  const action = loginDisabled ? 'Enable' : 'Disable';
  return (
    <ConfirmDialog
      open={open}
      title={`${action} Academy Login`}
      message={
        loginDisabled
          ? 'This will allow the academy owner and staff to log in again.'
          : 'This will prevent the academy owner and all staff from logging in. They will be signed out on their next request.'
      }
      confirmLabel={`${action} Login`}
      confirmVariant={loginDisabled ? 'primary' : 'danger'}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
