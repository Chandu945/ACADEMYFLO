'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStaff } from '@/application/staff/use-staff';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import styles from './page.module.css';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
] as const;

const SALARY_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;

/** Normalize a phone input to E.164 (+91XXXXXXXXXX). Returns the input as-is if already E.164 or empty. */
function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return trimmed;
}

export default function NewStaffPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const initialForm = useRef({
    fullName: '', email: '', phoneNumber: '', password: '',
    whatsappNumber: '', mobileNumber: '', address: '',
    startDate: new Date().toISOString().split('T')[0]!,
    gender: '', qualification: '', position: '',
    salaryAmount: '', salaryFrequency: 'MONTHLY',
  });
  const [form, setForm] = useState({ ...initialForm.current });

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm.current);

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
      const n = { ...prev }; delete n[field]; return n;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors['fullName'] = 'Full name is required';
    if (!form.email.trim()) {
      errors['email'] = 'Email is required';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      errors['email'] = 'Invalid email format';
    }
    if (!form.phoneNumber.trim()) {
      errors['phoneNumber'] = 'Phone number is required';
    } else if (!E164_RE.test(form.phoneNumber.trim())) {
      errors['phoneNumber'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (!form.password) {
      errors['password'] = 'Password is required';
    } else if (form.password.length < 8) {
      errors['password'] = 'Password must be at least 8 characters';
    }
    if (form.whatsappNumber.trim() && !E164_RE.test(normalizePhone(form.whatsappNumber))) {
      errors['whatsappNumber'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (form.mobileNumber.trim() && !E164_RE.test(normalizePhone(form.mobileNumber))) {
      errors['mobileNumber'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (form.address.trim().length > 300) {
      errors['address'] = 'Address must be 300 characters or less';
    }
    if (form.salaryAmount && Number(form.salaryAmount) < 0) {
      errors['salaryAmount'] = 'Salary must be a positive number';
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
    const result = await createStaff(
      {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        whatsappNumber: normalizePhone(form.whatsappNumber) || undefined,
        mobileNumber: normalizePhone(form.mobileNumber) || undefined,
        address: form.address.trim() || undefined,
        startDate: form.startDate || undefined,
        gender: form.gender || undefined,
        qualificationInfo: (form.qualification.trim() || form.position.trim())
          ? { qualification: form.qualification.trim() || null, position: form.position.trim() || null }
          : undefined,
        salaryConfig: form.salaryAmount
          ? { amount: Number(form.salaryAmount), frequency: form.salaryFrequency }
          : undefined,
      },
      accessToken,
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    setSuccess(true);
    redirectTimer.current = setTimeout(() => router.push('/staff'), 1200);
  }, [form, accessToken, router, validate]);

  return (
    <div className={styles.page}>
      <button type="button" onClick={() => router.push('/staff')} className={styles.backButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Staff
      </button>

      <Card title="Add New Staff Member">
        {success && <Alert variant="success" message="Staff member created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input label="Full Name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={fieldErrors['fullName']} placeholder="Staff member's full name" />
          <Input label="Email" required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={fieldErrors['email']} placeholder="Email address" />
          <Input label="Phone Number" required type="tel" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} error={fieldErrors['phoneNumber']} placeholder="+919876543210" hint="E.164 format with country code" />
          <Input label="Password" required type="password" value={form.password} onChange={(e) => set('password', e.target.value)} error={fieldErrors['password']} placeholder="Min 8 characters" hint="Minimum 8 characters" />

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Contact Information</h4>
            <div className={styles.sectionFields}>
              <Input label="WhatsApp Number" type="tel" value={form.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} error={fieldErrors['whatsappNumber']} placeholder="+919876543210" hint="E.164 format with +91 prefix" />
              <Input label="Mobile Number" type="tel" value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)} error={fieldErrors['mobileNumber']} placeholder="+919876543210" hint="E.164 format with +91 prefix" />
              <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} error={fieldErrors['address']} placeholder="Full address (optional)" hint="Max 300 characters" />
            </div>
          </div>

          <DatePicker label="Start Date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />

          <div>
            <label className={styles.fieldLabel}>Gender</label>
            <div className={styles.chipGroup}>
              {GENDERS.map((g) => (
                <Chip key={g.value} label={g.label} selected={form.gender === g.value} onSelect={() => set('gender', g.value)} />
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Qualification & Position</h4>
            <div className={styles.sectionFields}>
              <Input label="Qualification" value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="e.g. B.Ed, M.Sc (optional)" />
              <Input label="Position" value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Coach, Teacher (optional)" />
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Salary Details</h4>
            <div className={styles.gridRow}>
              <Input label="Salary Amount" type="number" value={form.salaryAmount} onChange={(e) => set('salaryAmount', e.target.value)} error={fieldErrors['salaryAmount']} placeholder="Amount (optional)" min={0} />
              <Select label="Frequency" options={SALARY_FREQUENCIES} value={form.salaryFrequency} onChange={(e) => set('salaryFrequency', e.target.value)} />
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => router.push('/staff')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Create Staff</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
