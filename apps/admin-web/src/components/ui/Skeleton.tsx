'use client';

import styles from './Skeleton.module.css';

type SkeletonProps = {
  width?: string;
  height?: string;
  borderRadius?: string;
};

export function Skeleton({ width = '100%', height = '20px', borderRadius }: SkeletonProps) {
  return (
    <div className={styles.skeleton} style={{ width, height, borderRadius }} aria-hidden="true" />
  );
}
