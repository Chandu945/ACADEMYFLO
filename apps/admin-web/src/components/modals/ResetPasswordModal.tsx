'use client';

import { useCallback, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

import styles from './ResetPasswordModal.module.css';

type ResetPasswordModalProps = {
  open: boolean;
  onSubmit: (temporaryPassword?: string) => Promise<string | null>;
  onClose: () => void;
};

export function ResetPasswordModal({ open, onSubmit, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = useCallback(() => {
    setPassword('');
    setError('');
    setLoading(false);
    setResultPassword(null);
    setCopied(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    setError('');
    const trimmed = password.trim();
    if (trimmed && trimmed.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const tempPw = await onSubmit(trimmed || undefined);
    setLoading(false);

    if (tempPw) {
      setResultPassword(tempPw);
    } else {
      setError('Failed to reset password');
    }
  }, [password, onSubmit]);

  const handleCopy = useCallback(async () => {
    if (!resultPassword) return;
    try {
      await navigator.clipboard.writeText(resultPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  }, [resultPassword]);

  return (
    <Modal open={open} title="Reset Owner Password" onClose={handleClose}>
      {resultPassword ? (
        <div className={styles.result}>
          <Alert variant="info">
            Copy this password now. You will not be able to view it again.
          </Alert>
          <div className={styles.passwordDisplay}>
            <code className={styles.passwordText}>{resultPassword}</code>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className={styles.actions}>
            <Button variant="primary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className={styles.description}>
            This will reset the academy owner&apos;s password. You can optionally provide a
            temporary password, or leave it blank to auto-generate one.
          </p>
          <div className={styles.form}>
            <Input
              label="Temporary Password (optional)"
              name="temporaryPassword"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              autoComplete="off"
            />
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleSubmit} loading={loading}>
              Reset Password
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
