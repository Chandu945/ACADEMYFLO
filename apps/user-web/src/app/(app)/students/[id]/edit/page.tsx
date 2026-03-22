'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import styles from './page.module.css';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;
const PINCODE_RE = /^\d{5,6}$/;

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: student, loading: fetching, error: fetchError } = useStudentDetail(params.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialFormRef = useRef<Record<string, string> | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
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

  // Cleanup redirect timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  // Pre-fill form from student data
  useEffect(() => {
    if (student && !initialized) {
      const addr = student.address;
      const populated = {
        fullName: student.fullName ?? '',
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0]! : '',
        gender: (student.gender ?? '').toUpperCase(),
        guardianName: student.guardian?.name ?? '',
        guardianMobile: student.guardian?.mobile ?? '',
        guardianEmail: student.guardian?.email ?? '',
        joiningDate: student.joiningDate ? student.joiningDate.split('T')[0]! : '',
        monthlyFee: String(student.monthlyFee ?? ''),
        addressLine1: addr?.line1 ?? '',
        addressCity: addr?.city ?? '',
        addressState: addr?.state ?? '',
        addressPincode: addr?.pincode ?? '',
      };
      setForm(populated);
      initialFormRef.current = { ...populated };
      setInitialized(true);
    }
  }, [student, initialized]);

  const isDirty = initialized && initialFormRef.current && JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

  // Warn on unsaved changes
  useEffect(() => {
    if (!isDirty || success) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, success]);

  const set = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const n = { ...prev };
      delete n[field];
      return n;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors['fullName'] = 'Full name is required';
    if (!form.guardianName.trim()) errors['guardianName'] = 'Guardian name is required';
    if (!form.guardianMobile.trim()) {
      errors['guardianMobile'] = 'Guardian mobile is required';
    } else if (!E164_RE.test(form.guardianMobile.trim())) {
      errors['guardianMobile'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (form.guardianEmail.trim() && !EMAIL_RE.test(form.guardianEmail.trim())) {
      errors['guardianEmail'] = 'Invalid email format';
    }
    if (!form.monthlyFee || Number(form.monthlyFee) <= 0) {
      errors['monthlyFee'] = 'Monthly fee must be greater than 0';
    }
    if (form.addressPincode.trim() && !PINCODE_RE.test(form.addressPincode.trim())) {
      errors['addressPincode'] = 'Pincode must be 5-6 digits';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!validate()) return;

    setLoading(true);
    const result = await updateStudent(
      params.id,
      {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
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
    redirectTimer.current = setTimeout(() => router.push(`/students/${params.id}`), 1200);
  }, [form, accessToken, router, params.id, validate]);

  if (fetching) return <Spinner centered size="lg" />;

  if (fetchError) return (
    <div className={styles.page}>
      <Alert variant="error" message={fetchError} />
      <Button variant="secondary" onClick={() => router.push(`/students/${params.id}`)} style={{ marginTop: 16 }}>
        Back to Student
      </Button>
    </div>
  );

  return (
    <div className={styles.page}>
      <button
        type="button"
        onClick={() => router.push(`/students/${params.id}`)}
        className={styles.backButton}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Student
      </button>

      <Card title="Edit Student">
        {success && <Alert variant="success" message="Student updated successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input label="Full Name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={fieldErrors['fullName']} />
          <DatePicker label="Date of Birth" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />

          <div>
            <label className={styles.fieldLabel}>Gender</label>
            <div className={styles.chipGroup}>
              {GENDERS.map((g) => (
                <Chip key={g.value} label={g.label} selected={form.gender === g.value} onSelect={() => set('gender', g.value)} />
              ))}
            </div>
          </div>

          {/* Guardian Information */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Guardian Information</h4>
            <div className={styles.sectionFields}>
              <Input label="Guardian Name" required value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} error={fieldErrors['guardianName']} />
              <Input
                label="Guardian Mobile" required type="tel" value={form.guardianMobile}
                onChange={(e) => set('guardianMobile', e.target.value)} error={fieldErrors['guardianMobile']}
                placeholder="+919876543210" hint="E.164 format with country code"
              />
              <Input label="Guardian Email" type="email" value={form.guardianEmail} onChange={(e) => set('guardianEmail', e.target.value)} error={fieldErrors['guardianEmail']} />
            </div>
          </div>

          {/* Academy Details */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Academy Details</h4>
            <div className={styles.sectionFields}>
              <DatePicker label="Joining Date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} />
              <Input label="Monthly Fee" required type="number" value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} error={fieldErrors['monthlyFee']} min={1} />
            </div>
          </div>

          {/* Address */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Address (Optional)</h4>
            <div className={styles.sectionFields}>
              <Input label="Address Line" value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} placeholder="Street address" />
              <div className={styles.gridRow}>
                <Input label="City" value={form.addressCity} onChange={(e) => set('addressCity', e.target.value)} placeholder="City" />
                <Input label="State" value={form.addressState} onChange={(e) => set('addressState', e.target.value)} placeholder="State" />
              </div>
              <Input label="Pincode" value={form.addressPincode} onChange={(e) => set('addressPincode', e.target.value)} error={fieldErrors['addressPincode']} placeholder="Pincode" maxLength={6} />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => router.push(`/students/${params.id}`)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Update Student</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
