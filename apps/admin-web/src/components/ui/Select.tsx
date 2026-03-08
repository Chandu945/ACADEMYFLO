'use client';

import type { SelectHTMLAttributes } from 'react';

import styles from './Select.module.css';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label: string;
  options: SelectOption[];
};

export function Select({ label, name, options, id, ...rest }: SelectProps) {
  const selectId = id ?? name;

  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <select id={selectId} name={name} className={styles.select} {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
