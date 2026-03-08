'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import styles from './ActionsPanel.module.css';

type ActionsPanelProps = {
  academyId: string;
  loginDisabled: boolean;
  onManualSubscription: () => void;
  onDeactivateSubscription: () => void;
  onToggleLogin: () => void;
  onForceLogout: () => void;
  onResetPassword: () => void;
};

export function ActionsPanel({
  academyId,
  loginDisabled,
  onManualSubscription,
  onDeactivateSubscription,
  onToggleLogin,
  onForceLogout,
  onResetPassword,
}: ActionsPanelProps) {
  return (
    <Card title="Actions">
      <div className={styles.grid}>
        <Button variant="primary" size="sm" onClick={onManualSubscription}>
          Set Manual Subscription
        </Button>
        <Button variant="danger" size="sm" onClick={onDeactivateSubscription}>
          Deactivate Subscription
        </Button>
        <Button variant={loginDisabled ? 'primary' : 'danger'} size="sm" onClick={onToggleLogin}>
          {loginDisabled ? 'Enable Login' : 'Disable Login'}
        </Button>
        <Button variant="danger" size="sm" onClick={onForceLogout}>
          Force Logout All Users
        </Button>
        <Button variant="danger" size="sm" onClick={onResetPassword}>
          Reset Owner Password
        </Button>
      </div>
      <div className={styles.links}>
        <Link href={`/academies/${academyId}/audit-logs`}>View Audit Logs &rarr;</Link>
      </div>
    </Card>
  );
}
