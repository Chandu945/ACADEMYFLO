'use client';

import { useEffect, useState } from 'react';

import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from '@academyflo/contracts';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

import styles from './AdminAuditFilters.module.css';

type Filters = {
  from?: string;
  to?: string;
  action?: string;
  entityType?: string;
  academyId?: string;
  actorUserId?: string;
};

type Props = {
  initial: Filters;
  onChange: (filters: Filters) => void;
};

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  ...AUDIT_ACTION_TYPES.map((a) => ({ value: a, label: a.replace(/_/g, ' ') })),
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  ...AUDIT_ENTITY_TYPES.map((e) => ({ value: e, label: e.replace(/_/g, ' ') })),
];

export function AdminAuditFilters({ initial, onChange }: Props) {
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [action, setAction] = useState(initial.action ?? '');
  const [entityType, setEntityType] = useState(initial.entityType ?? '');
  const [academyId, setAcademyId] = useState(initial.academyId ?? '');
  const [actorUserId, setActorUserId] = useState(initial.actorUserId ?? '');

  // Sync local state when URL-driven `initial` changes (e.g. browser back/forward)
  useEffect(() => {
    setFrom(initial.from ?? '');
    setTo(initial.to ?? '');
    setAction(initial.action ?? '');
    setEntityType(initial.entityType ?? '');
    setAcademyId(initial.academyId ?? '');
    setActorUserId(initial.actorUserId ?? '');
  }, [initial.from, initial.to, initial.action, initial.entityType, initial.academyId, initial.actorUserId]);

  const apply = () => {
    onChange({
      from: from || undefined,
      to: to || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      academyId: academyId.trim() || undefined,
      actorUserId: actorUserId.trim() || undefined,
    });
  };

  const clear = () => {
    setFrom('');
    setTo('');
    setAction('');
    setEntityType('');
    setAcademyId('');
    setActorUserId('');
    onChange({});
  };

  const hasFilters = !!(from || to || action || entityType || academyId || actorUserId);

  return (
    <form
      className={styles.bar}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className={styles.row}>
        <Input label="From" name="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" name="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select
          label="Action"
          name="action"
          options={ACTION_OPTIONS}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <Select
          label="Entity"
          name="entityType"
          options={ENTITY_OPTIONS}
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
      </div>
      <div className={styles.row}>
        <Input
          label="Academy ID"
          name="academyId"
          placeholder="UUID — optional"
          value={academyId}
          onChange={(e) => setAcademyId(e.target.value)}
        />
        <Input
          label="Actor user ID"
          name="actorUserId"
          placeholder="UUID — optional"
          value={actorUserId}
          onChange={(e) => setActorUserId(e.target.value)}
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
