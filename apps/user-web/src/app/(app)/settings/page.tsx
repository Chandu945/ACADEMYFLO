'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

type AcademySettings = {
  dueDateDay: number;
  receiptPrefix: string;
  lateFeeEnabled: boolean;
  gracePeriodDays: number;
  lateFeeAmount: number;
  lateFeeRepeatIntervalDays: number;
};

type InstituteInfo = {
  bankDetails: string;
  upiId: string;
};

export default function SettingsPage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingAcademy, setSavingAcademy] = useState(false);
  const [savingInstitute, setSavingInstitute] = useState(false);
  const [academySuccess, setAcademySuccess] = useState(false);
  const [instituteSuccess, setInstituteSuccess] = useState(false);
  const [academyError, setAcademyError] = useState<string | null>(null);
  const [instituteError, setInstituteError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [academy, setAcademy] = useState<AcademySettings>({
    dueDateDay: 1,
    receiptPrefix: 'REC',
    lateFeeEnabled: false,
    gracePeriodDays: 0,
    lateFeeAmount: 0,
    lateFeeRepeatIntervalDays: 30,
  });

  const [institute, setInstitute] = useState<InstituteInfo>({
    bankDetails: '',
    upiId: '',
  });

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/settings', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.academy) setAcademy(data.academy);
          if (data.institute) setInstitute(data.institute);
        }
      } catch {
        setFetchError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [accessToken]);

  const saveAcademy = useCallback(async () => {
    setSavingAcademy(true);
    setAcademySuccess(false);
    setAcademyError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ type: 'academy', ...academy }),
      });
      if (!res.ok) {
        let msg = 'Failed to save';
        try { const json = await res.json(); msg = json.message || msg; } catch { /* non-JSON */ }
        setAcademyError(msg);
      } else {
        setAcademySuccess(true);
        setTimeout(() => setAcademySuccess(false), 4000);
      }
    } catch {
      setAcademyError('Network error');
    } finally {
      setSavingAcademy(false);
    }
  }, [academy, accessToken]);

  const saveInstitute = useCallback(async () => {
    setSavingInstitute(true);
    setInstituteSuccess(false);
    setInstituteError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ type: 'institute', ...institute }),
      });
      if (!res.ok) {
        let msg = 'Failed to save';
        try { const json = await res.json(); msg = json.message || msg; } catch { /* non-JSON */ }
        setInstituteError(msg);
      } else {
        setInstituteSuccess(true);
        setTimeout(() => setInstituteSuccess(false), 4000);
      }
    } catch {
      setInstituteError('Network error');
    } finally {
      setSavingInstitute(false);
    }
  }, [institute, accessToken]);

  if (loading) return <Spinner centered size="lg" />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      {fetchError && <Alert variant="error" message={fetchError} />}

      {/* Academy Settings */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Academy Settings</h2>
        {academySuccess && <Alert variant="success" message="Academy settings saved successfully" />}
        {academyError && <Alert variant="error" message={academyError} />}
        <div className={styles.form}>
          <Input
            label="Due Date Day"
            type="number"
            min={1}
            max={28}
            value={String(academy.dueDateDay)}
            onChange={(e) => setAcademy((p) => ({ ...p, dueDateDay: Number(e.target.value) }))}
            hint="Day of the month when fee is due (1-28)"
          />
          <Input
            label="Receipt Prefix"
            value={academy.receiptPrefix}
            onChange={(e) => setAcademy((p) => ({ ...p, receiptPrefix: e.target.value }))}
            hint="Prefix for receipt numbers (e.g. REC)"
          />

          <div className={styles.toggleRow}>
            <div>
              <div className={styles.toggleLabel}>Late Fee</div>
              <div className={styles.toggleDescription}>Enable automatic late fee charges</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={academy.lateFeeEnabled}
              className={`${styles.toggleSwitch} ${academy.lateFeeEnabled ? styles.active : ''}`}
              onClick={() => setAcademy((p) => ({ ...p, lateFeeEnabled: !p.lateFeeEnabled }))}
              aria-label="Toggle late fee"
            />
          </div>

          {academy.lateFeeEnabled && (
            <>
              <Input
                label="Grace Period (Days)"
                type="number"
                value={String(academy.gracePeriodDays)}
                onChange={(e) => setAcademy((p) => ({ ...p, gracePeriodDays: Number(e.target.value) }))}
                hint="Days after due date before late fee applies"
              />
              <Input
                label="Late Fee Amount"
                type="number"
                value={String(academy.lateFeeAmount)}
                onChange={(e) => setAcademy((p) => ({ ...p, lateFeeAmount: Number(e.target.value) }))}
              />
              <Input
                label="Repeat Interval (Days)"
                type="number"
                value={String(academy.lateFeeRepeatIntervalDays)}
                onChange={(e) => setAcademy((p) => ({ ...p, lateFeeRepeatIntervalDays: Number(e.target.value) }))}
                hint="Days after which late fee repeats"
              />
            </>
          )}

          <div className={styles.saveRow}>
            <Button variant="primary" loading={savingAcademy} onClick={saveAcademy}>Save Academy Settings</Button>
          </div>
        </div>
      </div>

      {/* Institute Info */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Institute Information</h2>
        {instituteSuccess && <Alert variant="success" message="Institute info saved successfully" />}
        {instituteError && <Alert variant="error" message={instituteError} />}
        <div className={styles.form}>
          <Input
            label="Bank Details"
            value={institute.bankDetails}
            onChange={(e) => setInstitute((p) => ({ ...p, bankDetails: e.target.value }))}
            placeholder="Bank name, account number, IFSC"
          />
          <Input
            label="UPI ID"
            value={institute.upiId}
            onChange={(e) => setInstitute((p) => ({ ...p, upiId: e.target.value }))}
            placeholder="e.g. academy@upi"
          />

          <div className={styles.saveRow}>
            <Button variant="primary" loading={savingInstitute} onClick={saveInstitute}>Save Institute Info</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
