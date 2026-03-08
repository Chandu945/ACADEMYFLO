import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/ToastHost';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PlayConnect Admin',
  description: 'PlayConnect Academy Management — Super Admin Panel',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
