'use client';

import { useCallback, useEffect } from 'react';
import styles from './PhotoViewer.module.css';

export type PhotoViewerPhoto = {
  id: string;
  url: string;
  caption: string | null;
};

export type PhotoViewerProps = {
  photos: PhotoViewerPhoto[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function PhotoViewer({ photos, currentIndex, onClose, onNavigate }: PhotoViewerProps) {
  const photo = photos[currentIndex];
  const total = photos.length;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, total, onNavigate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while viewer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label="Photo viewer">
      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.counter}>
          {currentIndex + 1} of {total}
        </span>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close photo viewer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Main image */}
      <div className={styles.imageContainer} onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.image}
          src={photo.url}
          alt={photo.caption || 'Gallery photo'}
          draggable={false}
        />
      </div>

      {/* Caption */}
      {photo.caption && (
        <div className={styles.caption} onClick={(e) => e.stopPropagation()}>
          {photo.caption}
        </div>
      )}

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          type="button"
          className={`${styles.navButton} ${styles.navPrev}`}
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Previous photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {currentIndex < total - 1 && (
        <button
          type="button"
          className={`${styles.navButton} ${styles.navNext}`}
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Next photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
