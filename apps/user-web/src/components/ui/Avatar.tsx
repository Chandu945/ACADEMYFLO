'use client';

import React, { useMemo, useState } from 'react';
import styles from './Avatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const AVATAR_COLORS = [
  '#0891b2', // cyan
  '#7c3aed', // violet
  '#db2777', // pink
  '#ea580c', // orange
  '#16a34a', // green
  '#2563eb', // blue
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`;
  }
  return parts[0]?.substring(0, 2) ?? '?';
}

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  const initials = useMemo(() => (name ? getInitials(name) : '?'), [name]);
  const bgColor = useMemo(() => (name ? getColorFromName(name) : AVATAR_COLORS[0]), [name]);

  const classNames = [styles.avatar, styles[size], !showImage && styles.fallback, className]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = !showImage && name ? { backgroundColor: bgColor } : {};

  return (
    <span
      className={classNames}
      style={style}
      role="img"
      aria-label={alt ?? name ?? 'Avatar'}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name ?? 'Avatar'}
          className={styles.image}
          onError={() => setImgError(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
