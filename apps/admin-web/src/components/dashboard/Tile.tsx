'use client';

import styles from './Tile.module.css';

type TileProps = {
  label: string;
  count: number;
};

export function Tile({ label, count }: TileProps) {
  return (
    <div className={styles.tile} aria-label={`${label}: ${count}`}>
      <span className={styles.count}>{count.toLocaleString()}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
