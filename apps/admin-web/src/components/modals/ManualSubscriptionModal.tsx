'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ManualSubscriptionInput } from '@/domain/admin/academy-detail';
import { TIER_KEYS } from '@academyflo/contracts';
import { manualSubscriptionSchema } from '@/application/academy-detail/academy-actions.schemas';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';

import styles from './ManualSubscriptionModal.module.css';

type ManualSubscriptionModalProps = {
  open: boolean;
  loading: boolean;
  onSubmit: (input: ManualSubscriptionInput) => void;
  onClose: () => void;
};

const TIER_OPTIONS = [
  { value: '', label: 'Select tier' },
  ...TIER_KEYS.map((t) => ({ value: t, label: formatTierLabel(t) })),
];

function formatTierLabel(tierKey: string): string {
  switch (tierKey) {
    case 'TIER_0_50':
      return '0\u201350 students';
    case 'TIER_51_100':
      return '51\u2013100 students';
    case 'TIER_101_PLUS':
      return '101+ students';
    default:
      return tierKey;
  }
}

export function ManualSubscriptionModal({
  open,
  loading,
  onSubmit,
  onClose,
}: ManualSubscriptionModalProps) {
  const [tierKey, setTierKey] = useState('');
  const [paidStartAt, setPaidStartAt] = useState('');
  const [paidEndAt, setPaidEndAt] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setTierKey('');
    setPaidStartAt('');
    setPaidEndAt('');
    setManualNotes('');
    setPaymentReference('');
    setErrors({});
  }, []);

  // Reset form when modal opens to prevent stale values from previous submission
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(() => {
    const input = {
      tierKey,
      paidStartAt,
      paidEndAt,
      manualNotes: manualNotes.trim() || undefined,
      paymentReference: paymentReference.trim() || undefined,
    };

    const result = manualSubscriptionSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key && typeof key === 'string') {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(result.data as ManualSubscriptionInput);
  }, [tierKey, paidStartAt, paidEndAt, manualNotes, paymentReference, onSubmit]);

  return (
    <Modal open={open} title="Set Manual Subscription" onClose={handleClose}>
      <div className={styles.form}>
        <Select
          label="Tier"
          name="tierKey"
          options={TIER_OPTIONS}
          value={tierKey}
          onChange={(e) => setTierKey(e.target.value)}
        />
        {errors['tierKey'] && <span className={styles.error}>{errors['tierKey']}</span>}

        <Input
          label="Start Date"
          name="paidStartAt"
          type="date"
          value={paidStartAt}
          onChange={(e) => setPaidStartAt(e.target.value)}
          error={errors['paidStartAt']}
        />

        <Input
          label="End Date"
          name="paidEndAt"
          type="date"
          value={paidEndAt}
          onChange={(e) => setPaidEndAt(e.target.value)}
          error={errors['paidEndAt']}
        />

        <TextArea
          label="Notes (optional)"
          name="manualNotes"
          value={manualNotes}
          onChange={(e) => setManualNotes(e.target.value)}
          maxLength={200}
          rows={2}
        />

        <Input
          label="Payment Reference (optional)"
          name="paymentReference"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
          Set Subscription
        </Button>
      </div>
    </Modal>
  );
}
