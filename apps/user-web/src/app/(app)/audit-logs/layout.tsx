import type { ReactNode } from 'react';
import { requireRole } from '@/lib/require-role';

export default async function AuditLogsLayout({ children }: { children: ReactNode }) {
  await requireRole(['OWNER']);
  return <>{children}</>;
}
