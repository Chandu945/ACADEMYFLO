'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AcademyStatusFilter, TierFilter } from '@/domain/admin/academies';
import { ADMIN_ACADEMY_STATUSES, TIER_KEYS } from '@academyflo/contracts';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import styles from './AcademiesFilters.module.css';

type FiltersState = {
  status?: AcademyStatusFilter;
  tier?: TierFilter;
  search?: string;
};

type AcademiesFiltersProps = {
  status?: AcademyStatusFilter;
  tier?: TierFilter;
  search?: string;
  onFilterChange: (filters: FiltersState) => void;
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...ADMIN_ACADEMY_STATUSES.map((s) => ({
    value: s,
    label: s.replace(/_/g, ' '),
  })),
];

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  ...TIER_KEYS.map((t) => ({
    value: t,
    label: formatTierLabel(t),
  })),
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

export function AcademiesFilters({ status, tier, search, onFilterChange }: AcademiesFiltersProps) {
  const [searchInput, setSearchInput] = useState(search ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync external search prop changes
  useEffect(() => {
    setSearchInput(search ?? '');
  }, [search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onFilterChange({ status, tier, search: value.trim() || undefined });
      }, 300);
    },
    [status, tier, onFilterChange],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onFilterChange({
        status: (value || undefined) as AcademyStatusFilter | undefined,
        tier,
        search: searchInput.trim() || undefined,
      });
    },
    [tier, searchInput, onFilterChange],
  );

  const handleTierChange = useCallback(
    (value: string) => {
      onFilterChange({
        status,
        tier: (value || undefined) as TierFilter | undefined,
        search: searchInput.trim() || undefined,
      });
    },
    [status, searchInput, onFilterChange],
  );

  const handleClear = useCallback(() => {
    setSearchInput('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onFilterChange({});
  }, [onFilterChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={styles.filters}>
      <Select
        label="Status"
        name="status"
        options={STATUS_OPTIONS}
        value={status ?? ''}
        onChange={(e) => handleStatusChange(e.target.value)}
      />
      <Select
        label="Tier"
        name="tier"
        options={TIER_OPTIONS}
        value={tier ?? ''}
        onChange={(e) => handleTierChange(e.target.value)}
      />
      <div className={styles.searchField}>
        <label htmlFor="search" className={styles.label}>
          Search
        </label>
        <input
          id="search"
          type="text"
          placeholder="Name, email..."
          className={styles.searchInput}
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          maxLength={80}
        />
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
