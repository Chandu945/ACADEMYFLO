'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/application/auth/use-auth';
import { AppShell } from '@/components/shell/AppShell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
