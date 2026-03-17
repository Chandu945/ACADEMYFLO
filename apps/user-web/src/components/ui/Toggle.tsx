'use client';

import React, { useId } from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className,
  id,
  name,
}: ToggleProps) {
  const autoId = useId();
  const toggleId = id ?? autoId;

  const wrapperClasses = [styles.wrapper, disabled && styles.disabled, className]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClasses} htmlFor={toggleId}>
      <input
        id={toggleId}
        name={name}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-checked={checked}
      />
      <span className={`${styles.track} ${checked ? styles.trackActive : ''}`}>
        <span className={`${styles.thumb} ${checked ? styles.thumbActive : ''}`} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
