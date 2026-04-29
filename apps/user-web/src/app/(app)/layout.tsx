'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/application/auth/use-auth';
import { AppShell } from '@/components/shell/AppShell';
import { AcademySetupGuard } from '@/components/shell/AcademySetupGuard';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AcademySetupGuard>
        <AppShell>{children}</AppShell>
      </AcademySetupGuard>
    </AuthProvider>
  );
}
