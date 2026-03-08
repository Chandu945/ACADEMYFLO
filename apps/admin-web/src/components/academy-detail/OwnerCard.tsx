'use client';

import type { AcademyOwner } from '@/domain/admin/academy-detail';
import { Card } from '@/components/ui/Card';

import styles from './OwnerCard.module.css';

type OwnerCardProps = {
  owner: AcademyOwner;
};

export function OwnerCard({ owner }: OwnerCardProps) {
  return (
    <Card title="Owner">
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Name</dt>
          <dd>{owner.fullName}</dd>
        </div>
        <div className={styles.row}>
          <dt>Email</dt>
          <dd>{owner.email}</dd>
        </div>
        <div className={styles.row}>
          <dt>Phone</dt>
          <dd>{owner.phoneNumber}</dd>
        </div>
      </dl>
    </Card>
  );
}
