'use client';

import type { InputHTMLAttributes } from 'react';

import styles from './Input.module.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, name, error, id, ...rest }: InputProps) {
  const inputId = id ?? name;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-invalid={!!error || undefined}
        aria-describedby={errorId}
        {...rest}
      />
      {error && (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
