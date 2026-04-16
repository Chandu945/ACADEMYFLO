import type { ReactNode } from 'react';
import { requireRole } from '@/lib/require-role';

export default async function SubscriptionLayout({ children }: { children: ReactNode }) {
  await requireRole(['OWNER']);
  return <>{children}</>;
}
