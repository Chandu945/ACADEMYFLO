'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStaff, updateStaff } from '@/application/staff/use-staff';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Spinner';

const GENDERS = ['Male', 'Female', 'Other'] as const;
const SALARY_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: staffList, loading: fetching } = useStaff();
  const staffMember = staffList.find((s) => s.id === params.id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    startDate: '',
    gender: 'Male',
    qualification: '',
    position: '',
    salaryAmount: '',
    salaryFrequency: 'MONTHLY',
  });

  useEffect(() => {
    if (staffMember) {
      setForm({
        fullName: staffMember.fullName ?? '',
        email: staffMember.email ?? '',
        phoneNumber: staffMember.phoneNumber ?? '',
        startDate: staffMember.startDate ? staffMember.startDate.split('T')[0] : '',
        gender: staffMember.gender ?? 'Male',
        qualification: staffMember.qualificationInfo?.qualification ?? '',
        position: staffMember.qualificationInfo?.position ?? '',
        salaryAmount: staffMember.salaryConfig?.amount ? String(staffMember.salaryConfig.amount) : '',
        salaryFrequency: staffMember.salaryConfig?.frequency ?? 'MONTHLY',
      });
    }
  }, [staffMember]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    if (!form.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const result = await updateStaff(
      params.id,
      {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        startDate: form.startDate || undefined,
        gender: form.gender,
        qualificationInfo: {
          qualification: form.qualification.trim() || undefined,
          position: form.position.trim() || undefined,
        },
        salaryConfig: form.salaryAmount
          ? { amount: Number(form.salaryAmount), frequency: form.salaryFrequency }
          : undefined,
      },
      accessToken,
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/staff'), 1200);
  }, [form, accessToken, router, params.id]);

  if (fetching) return <Spinner centered size="lg" />;
  if (!staffMember && !fetching) return <Alert variant="error" message="Staff member not found" />;

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '680px' }}>
      <button
        onClick={() => router.push('/staff')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: '24px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Staff
      </button>

      <Card title="Edit Staff Member">
        {success && <Alert variant="success" message="Staff member updated successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Input label="Full Name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={fieldErrors.fullName} />
          <Input label="Email" required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={fieldErrors.email} />
          <Input label="Phone Number" required type="tel" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} error={fieldErrors.phoneNumber} />
          <DatePicker label="Start Date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-medium)' }}>Gender</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {GENDERS.map((g) => (
                <Chip key={g} label={g} selected={form.gender === g} onSelect={() => set('gender', g)} />
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-primary)' }}>Qualification & Position</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Input label="Qualification" value={form.qualification} onChange={(e) => set('qualification', e.target.value)} />
              <Input label="Position" value={form.position} onChange={(e) => set('position', e.target.value)} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-primary)' }}>Salary Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Input label="Salary Amount" type="number" value={form.salaryAmount} onChange={(e) => set('salaryAmount', e.target.value)} />
              <Select label="Frequency" options={SALARY_FREQUENCIES} value={form.salaryFrequency} onChange={(e) => set('salaryFrequency', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <Button type="button" variant="outline" onClick={() => router.push('/staff')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading}>Update Staff</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
