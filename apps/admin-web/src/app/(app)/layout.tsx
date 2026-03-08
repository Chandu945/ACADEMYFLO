'use client';

import type { ReactNode } from 'react';

import { AdminAuthProvider } from '@/application/auth/use-admin-auth';
import { AdminShell } from '@/components/shell/AdminShell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
