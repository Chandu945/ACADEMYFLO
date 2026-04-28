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

const NOTES_MAX = 200;
const PAYMENT_REF_MAX = 200;

const TIER_OPTIONS = [
  { value: '', label: 'Select tier' },
  ...TIER_KEYS.map((t) => ({ value: t, label: formatTierLabel(t) })),
];

function formatTierLabel(tierKey: string): string {
  switch (tierKey) {
    case 'TIER_0_50':
      return '0–50 students  ·  ₹299 / month';
    case 'TIER_51_100':
      return '51–100 students  ·  ₹499 / month';
    case 'TIER_101_PLUS':
      return '101+ students  ·  ₹699 / month';
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
    <Modal open={open} title="Set manual subscription" onClose={handleClose}>
      <p className={styles.intro}>
        Manually grant a paid subscription to this academy. Use for offline
        payments, comp accounts, or migration from an old system.
      </p>

      <div className={styles.form}>
        <div>
          <Select
            label="Tier"
            name="tierKey"
            options={TIER_OPTIONS}
            value={tierKey}
            onChange={(e) => setTierKey(e.target.value)}
            aria-invalid={!!errors['tierKey'] || undefined}
          />
          {errors['tierKey'] ? (
            <span className={styles.error}>{errors['tierKey']}</span>
          ) : (
            <span className={styles.hint}>
              Pricing tier the academy will be billed against.
            </span>
          )}
        </div>

        <div>
          <div className={styles.dateRow}>
            <Input
              label="Start date"
              name="paidStartAt"
              type="date"
              value={paidStartAt}
              onChange={(e) => setPaidStartAt(e.target.value)}
              error={errors['paidStartAt']}
            />
            <Input
              label="End date"
              name="paidEndAt"
              type="date"
              value={paidEndAt}
              onChange={(e) => setPaidEndAt(e.target.value)}
              error={errors['paidEndAt']}
            />
          </div>
          {!errors['paidStartAt'] && !errors['paidEndAt'] && (
            <span className={styles.hint}>
              Paid period runs from start (inclusive) to end (inclusive).
            </span>
          )}
        </div>

        <div className={styles.notesField}>
          <TextArea
            label="Notes (optional)"
            name="manualNotes"
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value.slice(0, NOTES_MAX))}
            maxLength={NOTES_MAX}
            rows={3}
            placeholder="e.g. Comp account for partner academy until end of pilot."
          />
          <span
            className={styles.notesCounter}
            aria-live="polite"
            aria-label={`${manualNotes.length} of ${NOTES_MAX} characters used`}
          >
            {manualNotes.length} / {NOTES_MAX}
          </span>
        </div>

        <div>
          <Input
            label="Payment reference (optional)"
            name="paymentReference"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            maxLength={PAYMENT_REF_MAX}
            placeholder="e.g. NEFT-2026-00347 or invoice number"
          />
          <span className={styles.hint}>
            Receipt number, bank txn ID, or invoice — recorded to the audit
            trail.
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="md" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={handleSubmit} loading={loading}>
          Set subscription
        </Button>
      </div>
    </Modal>
  );
}
