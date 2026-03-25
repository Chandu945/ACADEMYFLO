import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/application/theme/use-theme';
import { ToastProvider } from '@/components/ui/ToastHost';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PlayConnect',
  description: 'PlayConnect — Academy Management, Simplified',
  icons: { icon: '/favicon.ico' },
};

/**
 * Inline script that runs before React hydration to prevent flash of wrong
 * theme. Reads the persisted preference from localStorage and sets the
 * data-theme attribute on <html> immediately.
 */
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('pc_theme') || 'system';
    if (t === 'system') {
      document.documentElement.dataset.theme = 'system';
    } else {
      document.documentElement.dataset.theme = t;
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
