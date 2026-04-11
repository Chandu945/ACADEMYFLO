import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    template: '%s — Academyflo',
    default: 'Academyflo',
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
