import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/ToastHost';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PlayConnect',
  description: 'PlayConnect — Academy Management, Simplified',
  icons: { icon: '/favicon.ico' },
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
