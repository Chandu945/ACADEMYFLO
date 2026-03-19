'use client';

import React, { forwardRef, useId } from 'react';
import styles from './TextArea.module.css';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  showCharCount?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { label, error, hint, required, showCharCount, maxLength, value, className, id, ...props },
    ref,
  ) => {
    const autoId = useId();
    const charCountId = useId();
    const textareaId = id ?? autoId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint && !error ? `${textareaId}-hint` : undefined;

    const currentLength = typeof value === 'string' ? value.length : 0;
    const isOver = maxLength ? currentLength > maxLength : false;

    const wrapperClasses = [styles.wrapper, error && styles.hasError, className]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={styles.textarea}
          aria-invalid={!!error}
          aria-describedby={[errorId ?? hintId, showCharCount && maxLength ? charCountId : undefined].filter(Boolean).join(' ') || undefined}
          aria-required={required}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        {error && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
        {showCharCount && maxLength && (
          <span
            id={charCountId}
            className={`${styles.charCount} ${isOver ? styles.charCountOver : ''}`}
            aria-live="polite"
          >
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
