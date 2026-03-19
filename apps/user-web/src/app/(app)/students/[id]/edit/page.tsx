'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudentDetail, updateStudent } from '@/application/students/use-students';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Spinner';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
] as const;

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: student, loading: fetching } = useStudentDetail(params.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'MALE',
    guardianName: '',
    guardianMobile: '',
    guardianEmail: '',
    joiningDate: '',
    monthlyFee: '',
    addressLine1: '',
    addressCity: '',
    addressState: '',
    addressPincode: '',
  });

  useEffect(() => {
    if (student) {
      const addr = typeof student.address === 'object' && student.address ? student.address : {};
      setForm({
        fullName: student.fullName ?? '',
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
        gender: (student.gender ?? 'MALE').toUpperCase(),
        guardianName: student.guardian?.name ?? '',
        guardianMobile: student.guardian?.mobile ?? '',
        guardianEmail: student.guardian?.email ?? '',
        joiningDate: student.joiningDate ? student.joiningDate.split('T')[0] : '',
        monthlyFee: String(student.monthlyFee ?? ''),
        addressLine1: addr.line1 ?? '',
        addressCity: addr.city ?? '',
        addressState: addr.state ?? '',
        addressPincode: addr.pincode ?? '',
      });
    }
  }, [student]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.guardianName.trim()) errors.guardianName = 'Guardian name is required';
    if (!form.guardianMobile.trim()) errors.guardianMobile = 'Guardian mobile is required';
    if (!form.monthlyFee || Number(form.monthlyFee) <= 0) errors.monthlyFee = 'Valid monthly fee is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const result = await updateStudent(
      params.id,
      {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        guardian: {
          name: form.guardianName.trim(),
          mobile: form.guardianMobile.trim(),
          email: form.guardianEmail.trim() || undefined,
        },
        joiningDate: form.joiningDate || undefined,
        monthlyFee: Number(form.monthlyFee),
        address: form.addressLine1.trim() ? {
          line1: form.addressLine1.trim(),
          city: form.addressCity.trim() || undefined,
          state: form.addressState.trim() || undefined,
          pincode: form.addressPincode.trim() || undefined,
        } : undefined,
      },
      accessToken,
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push(`/students/${params.id}`), 1200);
  }, [form, accessToken, router, params.id]);

  if (fetching) return <Spinner centered size="lg" />;

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '680px' }}>
      <button
        onClick={() => router.push(`/students/${params.id}`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: '24px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Student
      </button>

      <Card title="Edit Student">
        {success && <Alert variant="success" message="Student updated successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Input label="Full Name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={fieldErrors.fullName} />
          <DatePicker label="Date of Birth" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-medium)' }}>Gender</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {GENDERS.map((g) => (
                <Chip key={g.value} label={g.label} selected={form.gender === g.value} onSelect={() => set('gender', g.value)} />
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-primary)' }}>Guardian Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Input label="Guardian Name" required value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} error={fieldErrors.guardianName} />
              <Input label="Guardian Mobile" required type="tel" value={form.guardianMobile} onChange={(e) => set('guardianMobile', e.target.value)} error={fieldErrors.guardianMobile} />
              <Input label="Guardian Email" type="email" value={form.guardianEmail} onChange={(e) => set('guardianEmail', e.target.value)} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-primary)' }}>Academy Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <DatePicker label="Joining Date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} />
              <Input label="Monthly Fee" required type="number" value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} error={fieldErrors.monthlyFee} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-primary)' }}>Address (Optional)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Input label="Address Line" value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} placeholder="Street address" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Input label="City" value={form.addressCity} onChange={(e) => set('addressCity', e.target.value)} placeholder="City" />
                <Input label="State" value={form.addressState} onChange={(e) => set('addressState', e.target.value)} placeholder="State" />
              </div>
              <Input label="Pincode" value={form.addressPincode} onChange={(e) => set('addressPincode', e.target.value)} placeholder="Pincode" maxLength={6} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <Button type="button" variant="outline" onClick={() => router.push(`/students/${params.id}`)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Update Student</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
