'use client';

import styles from './AuditLogsEmptyState.module.css';

export function AuditLogsEmptyState() {
  return (
    <div className={styles.container}>
      <p className={styles.text}>No audit logs found for the selected filters.</p>
      <p className={styles.hint}>Try adjusting the date range or action type filter.</p>
    </div>
  );
}
