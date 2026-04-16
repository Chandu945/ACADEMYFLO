import type { ReactNode } from 'react';
import { requireRole } from '@/lib/require-role';

export default async function ChildrenLayout({ children }: { children: ReactNode }) {
  await requireRole(['PARENT']);
  return <>{children}</>;
}
