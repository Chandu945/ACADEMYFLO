'use client';

import { useEffect, useState } from 'react';

import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PAYMENT_STATUSES, type PaymentStatus } from '@/application/admin-payments/admin-payments.schemas';

import styles from './AdminPaymentsFilters.module.css';

type Filters = {
  status?: PaymentStatus;
  academyId?: string;
  from?: string;
  to?: string;
  stuckThresholdMinutes?: number;
};

type Props = {
  initial: Filters;
  onChange: (filters: Filters) => void;
};

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...PAYMENT_STATUSES.map((s) => ({ value: s, label: s })),
];

const STUCK_PRESETS = [
  { value: '', label: 'Off' },
  { value: '15', label: 'PENDING > 15 min' },
  { value: '60', label: 'PENDING > 1 hour' },
  { value: '1440', label: 'PENDING > 1 day' },
];

export function AdminPaymentsFilters({ initial, onChange }: Props) {
  const [status, setStatus] = useState<string>(initial.status ?? '');
  const [academyId, setAcademyId] = useState(initial.academyId ?? '');
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [stuck, setStuck] = useState<string>(
    initial.stuckThresholdMinutes !== undefined ? String(initial.stuckThresholdMinutes) : '',
  );

  useEffect(() => {
    setStatus(initial.status ?? '');
    setAcademyId(initial.academyId ?? '');
    setFrom(initial.from ?? '');
    setTo(initial.to ?? '');
    setStuck(initial.stuckThresholdMinutes !== undefined ? String(initial.stuckThresholdMinutes) : '');
  }, [initial.status, initial.academyId, initial.from, initial.to, initial.stuckThresholdMinutes]);

  const apply = () => {
    onChange({
      status: (status as PaymentStatus) || undefined,
      academyId: academyId.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
      stuckThresholdMinutes: stuck ? Number.parseInt(stuck, 10) : undefined,
    });
  };

  const clear = () => {
    setStatus('');
    setAcademyId('');
    setFrom('');
    setTo('');
    setStuck('');
    onChange({});
  };

  const hasFilters = !!(status || academyId || from || to || stuck);

  return (
    <form
      className={styles.bar}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className={styles.row}>
        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Select
          label="Stuck"
          name="stuck"
          options={STUCK_PRESETS}
          value={stuck}
          onChange={(e) => setStuck(e.target.value)}
        />
        <Input label="From" name="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" name="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className={styles.row}>
        <Input
          label="Academy ID"
          name="academyId"
          placeholder="UUID — optional"
          value={academyId}
          onChange={(e) => setAcademyId(e.target.value)}
        />
        <div className={styles.actions}>
          <Button type="submit" variant="primary" size="sm">
            Apply
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={clear} disabled={!hasFilters}>
            Clear
          </Button>
        </div>
      </div>
    </form>
  );
}
