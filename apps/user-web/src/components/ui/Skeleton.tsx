'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'rectangular' | 'circle' | 'text' | 'rounded';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: SkeletonVariant;
  className?: string;
  count?: number;
  gap?: string | number;
}

export function Skeleton({
  width,
  height,
  variant = 'rectangular',
  className,
  count = 1,
  gap = 8,
}: SkeletonProps) {
  const variantClass = variant !== 'rectangular' ? styles[variant] : '';

  const classNames = [styles.skeleton, variantClass, className].filter(Boolean).join(' ');

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (count === 1) {
    return <span className={classNames} style={style} aria-hidden="true" />;
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: typeof gap === 'number' ? `${gap}px` : gap }}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={classNames} style={style} />
      ))}
    </div>
  );
}
