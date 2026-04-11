import type { Metadata } from 'next';

// Metadata is exported from the server boundary of the page module.
// DashboardContent is a 'use client' component that handles all rendering.
import DashboardContent from './DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard — Academyflo',
  description: 'Academy management dashboard — KPIs, finances, and birthdays at a glance',
};

export default function DashboardPage() {
  return <DashboardContent />;
}
