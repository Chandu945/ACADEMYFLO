'use client';

import React, { useEffect, useRef, useCallback, useId } from 'react';
import styles from './Modal.module.css';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  footer,
  children,
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (!closeOnBackdrop) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isClickOutside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;
      if (isClickOutside) {
        onClose();
      }
    },
    [onClose, closeOnBackdrop],
  );

  const classNames = [styles.dialog, styles[size]].join(' ');

  return (
    <dialog
      ref={dialogRef}
      className={classNames}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'Dialog'}
      aria-modal="true"
    >
      {title && (
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        </div>
      )}
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close dialog"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
