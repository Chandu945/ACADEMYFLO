'use client';

import Link from 'next/link';

import type { AcademyListRow } from '@/domain/admin/academies';
import { Table } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';

import styles from './AcademiesTable.module.css';

type AcademiesTableProps = {
  items: AcademyListRow[];
  loading: boolean;
};

const DASH = '\u2014';

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function formatTier(tierKey: string | null): string {
  if (!tierKey) return DASH;
  switch (tierKey) {
    case 'TIER_0_50':
      return '0\u201350';
    case 'TIER_51_100':
      return '51\u2013100';
    case 'TIER_101_PLUS':
      return '101+';
    default:
      return tierKey;
  }
}

function formatCount(value: number | null): string {
  return value != null ? String(value) : DASH;
}

function formatRevenue(value: number | null): string {
  return value != null ? `\u20B9${value.toLocaleString('en-IN')}` : DASH;
}

const SKELETON_ROWS = 5;
const COLUMNS = [
  'Academy Name',
  'Owner',
  'Email',
  'Phone',
  'Status',
  'Tier',
  'Students',
  'Staff',
  'Revenue',
  'Actions',
];

export function AcademiesTable({ items, loading }: AcademiesTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th key={col} scope="col">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <tr key={`skel-${i}`}>
              {COLUMNS.map((col) => (
                <td key={col}>
                  <Skeleton height="16px" width="80%" />
                </td>
              ))}
            </tr>
          ))}
        {!loading && items.length === 0 && (
          <tr>
            <td colSpan={COLUMNS.length} className={styles.emptyCell}>
              No academies found
            </td>
          </tr>
        )}
        {!loading &&
          items.map((row) => (
            <tr key={row.academyId}>
              <td>{row.academyName}</td>
              <td>{row.ownerName}</td>
              <td>{row.ownerEmail}</td>
              <td>{row.ownerPhone ?? DASH}</td>
              <td>{formatStatus(row.status)}</td>
              <td>{formatTier(row.tierKey)}</td>
              <td>{formatCount(row.activeStudentCount)}</td>
              <td>{formatCount(row.staffCount)}</td>
              <td>{formatRevenue(row.thisMonthRevenueTotal)}</td>
              <td>
                <Link href={`/academies/${row.academyId}`}>View</Link>
              </td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
}
