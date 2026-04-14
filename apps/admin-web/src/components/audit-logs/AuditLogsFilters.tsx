'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AuditActionType } from '@/domain/admin/audit-logs';
import { AUDIT_ACTION_TYPES } from '@playconnect/contracts';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

import styles from './AuditLogsFilters.module.css';

type FiltersState = {
  from?: string;
  to?: string;
  actionType?: AuditActionType;
};

type AuditLogsFiltersProps = {
  from?: string;
  to?: string;
  actionType?: AuditActionType;
  onApply: (filters: FiltersState) => void;
  onClear: () => void;
};

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All Actions' },
  ...AUDIT_ACTION_TYPES.map((a) => ({
    value: a,
    label: a.replace(/_/g, ' '),
  })),
];

export function AuditLogsFilters({
  from,
  to,
  actionType,
  onApply,
  onClear,
}: AuditLogsFiltersProps) {
  const [localFrom, setLocalFrom] = useState(from ?? '');
  const [localTo, setLocalTo] = useState(to ?? '');
  const [localAction, setLocalAction] = useState(actionType ?? '');

  // Sync local state when props change (e.g., browser back/forward)
  useEffect(() => { setLocalFrom(from ?? ''); }, [from]);
  useEffect(() => { setLocalTo(to ?? ''); }, [to]);
  useEffect(() => { setLocalAction(actionType ?? ''); }, [actionType]);

  const handleApply = useCallback(() => {
    onApply({
      from: localFrom || undefined,
      to: localTo || undefined,
      actionType: (localAction || undefined) as AuditActionType | undefined,
    });
  }, [localFrom, localTo, localAction, onApply]);

  const handleClear = useCallback(() => {
    setLocalFrom('');
    setLocalTo('');
    setLocalAction('');
    onClear();
  }, [onClear]);

  return (
    <div className={styles.filters}>
      <Input
        label="From"
        name="from"
        type="date"
        value={localFrom}
        onChange={(e) => setLocalFrom(e.target.value)}
      />
      <Input
        label="To"
        name="to"
        type="date"
        value={localTo}
        onChange={(e) => setLocalTo(e.target.value)}
      />
      <Select
        label="Action Type"
        name="actionType"
        options={ACTION_TYPE_OPTIONS}
        value={localAction}
        onChange={(e) => setLocalAction(e.target.value)}
      />
      <div className={styles.actions}>
        <Button variant="primary" size="sm" onClick={handleApply}>
          Apply
        </Button>
        <Button variant="secondary" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
