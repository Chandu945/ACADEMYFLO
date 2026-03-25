'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/application/auth/use-auth';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

interface AcademyAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface AcademyInfo {
  name: string;
  address?: AcademyAddress;
  contactPhone?: string;
  contactEmail?: string;
  workingDays?: string[];
}

export default function AcademyInfoPage() {
  const { accessToken } = useAuth();
  const [academy, setAcademy] = useState<AcademyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcademy = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/parent/academy', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load academy information');
      }
      const data = await res.json();
      setAcademy(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAcademy();
  }, [fetchAcademy]);

  if (loading) {
    return <Spinner centered size="lg" />;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Alert
          variant="error"
          message={error}
          action={{ label: 'Retry', onClick: fetchAcademy }}
        />
      </div>
    );
  }

  if (!academy) {
    return (
      <div className={styles.page}>
        <Alert variant="info" message="No academy information available." />
      </div>
    );
  }

  const addressParts = [
    academy.address?.line1,
    academy.address?.line2,
    academy.address?.city,
    academy.address?.state,
    academy.address?.pincode,
  ].filter(Boolean);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className={styles.title}>Academy Information</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.icon} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <div className={styles.fieldGroup}>
            <span className={styles.label}>Academy Name</span>
            <span className={styles.value}>{academy.name}</span>
          </div>
        </div>

        {addressParts.length > 0 && (
          <div className={styles.row}>
            <span className={styles.icon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div className={styles.fieldGroup}>
              <span className={styles.label}>Address</span>
              <span className={styles.value}>{addressParts.join(', ')}</span>
            </div>
          </div>
        )}

        {academy.contactPhone && (
          <div className={styles.row}>
            <span className={styles.icon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <div className={styles.fieldGroup}>
              <span className={styles.label}>Contact Phone</span>
              <span className={styles.value}>{academy.contactPhone}</span>
            </div>
          </div>
        )}

        {academy.contactEmail && (
          <div className={styles.row}>
            <span className={styles.icon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <div className={styles.fieldGroup}>
              <span className={styles.label}>Contact Email</span>
              <span className={styles.value}>{academy.contactEmail}</span>
            </div>
          </div>
        )}

        {academy.workingDays && academy.workingDays.length > 0 && (
          <div className={styles.row}>
            <span className={styles.icon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div className={styles.fieldGroup}>
              <span className={styles.label}>Working Days</span>
              <span className={styles.value}>{academy.workingDays.join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
