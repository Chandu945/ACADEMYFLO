'use client';

import type { TextareaHTMLAttributes } from 'react';

import styles from './TextArea.module.css';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export function TextArea({ label, name, error, id, ...rest }: TextAreaProps) {
  const textareaId = id ?? name;
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={textareaId} className={styles.label}>
        {label}
      </label>
      <textarea
        id={textareaId}
        name={name}
        className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
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
