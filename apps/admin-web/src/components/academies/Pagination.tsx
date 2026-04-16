'use client';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import styles from './Pagination.module.css';

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemSingular?: string;
  itemPlural?: string;
  pageSizeOptions?: Array<{ value: string; label: string }>;
};

const PAGE_SIZE_OPTIONS = [
  { value: '20', label: '20 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
];

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  itemSingular = 'academy',
  itemPlural = 'academies',
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className={styles.pagination}>
      <span className={styles.info}>
        {totalItems} {totalItems === 1 ? itemSingular : itemPlural}
      </span>
      <div className={styles.controls}>
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          Prev
        </Button>
        <span className={styles.pageIndicator}>
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
      <Select
        label="Items per page"
        hideLabel
        name="pageSize"
        options={pageSizeOptions}
        value={String(pageSize)}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      />
    </div>
  );
}
