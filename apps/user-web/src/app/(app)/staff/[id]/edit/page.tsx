'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStaffDetail, updateStaff } from '@/application/staff/use-staff';
import { useAuth } from '@/application/auth/use-auth';
import { isValidObjectId } from '@/infra/validation/ids';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

/** Safely convert any date string to YYYY-MM-DD for HTML date input */
function toDateInputValue(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw.includes('T')) { const p = raw.split('T')[0]; if (p && /^\d{4}-\d{2}-\d{2}$/.test(p)) return p; }
  const d = new Date(raw);
  return !isNaN(d.getTime()) ? d.toISOString().split('T')[0]! : '';
}

import { GENDERS } from '@academyflo/contracts';
const GENDER_OPTIONS = GENDERS.map((g) => ({ value: g, label: g.charAt(0) + g.slice(1).toLowerCase() }));

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

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const idIsValid = isValidObjectId(params.id);
  const { data: staffMember, loading: fetching, error: fetchError } = useStaffDetail(
    idIsValid ? params.id : '',
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialFormRef = useRef<Record<string, string> | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    whatsappNumber: '',
    mobileNumber: '',
    address: '',
    password: '',
    startDate: '',
    gender: '',
    qualification: '',
    position: '',
    salaryAmount: '',
    salaryFrequency: 'MONTHLY',
  });

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  useEffect(() => {
    if (staffMember && !initialized) {
      const populated = {
        fullName: staffMember.fullName ?? '',
        email: staffMember.email ?? '',
        phoneNumber: staffMember.phoneNumber ?? '',
        whatsappNumber: staffMember.whatsappNumber ?? '',
        mobileNumber: staffMember.mobileNumber ?? '',
        address: staffMember.address ?? '',
        password: '',
        startDate: toDateInputValue(staffMember.startDate),
        gender: (staffMember.gender ?? '').toUpperCase(),
        qualification: staffMember.qualificationInfo?.qualification ?? '',
        position: staffMember.qualificationInfo?.position ?? '',
        salaryAmount: staffMember.salaryConfig?.amount ? String(staffMember.salaryConfig.amount) : '',
        salaryFrequency: staffMember.salaryConfig?.frequency ?? 'MONTHLY',
      };
      setForm(populated);
      initialFormRef.current = { ...populated };
      setInitialized(true);
    }
  }, [staffMember, initialized]);

  const isDirty = initialized && initialFormRef.current && JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

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
    if (form.whatsappNumber.trim() && !E164_RE.test(normalizePhone(form.whatsappNumber))) {
      errors['whatsappNumber'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (form.mobileNumber.trim() && !E164_RE.test(normalizePhone(form.mobileNumber))) {
      errors['mobileNumber'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (form.address.trim().length > 300) {
      errors['address'] = 'Address must be 300 characters or less';
    }
    if (form.password && form.password.length < 8) {
      errors['password'] = 'Password must be at least 8 characters';
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
    const payload: Record<string, unknown> = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
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
    };
    if (form.password) {
      payload.password = form.password;
    }
    const result = await updateStaff(
      params.id,
      payload,
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
  }, [form, accessToken, router, params.id, validate]);

  if (!idIsValid) {
    return (
      <div className={styles.page}>
        <Alert variant="error" message="Invalid staff id" />
        <Button variant="secondary" onClick={() => router.push('/staff')} style={{ marginTop: 16 }}>
          Back to Staff
        </Button>
      </div>
    );
  }

  if (fetching) return <Spinner centered size="lg" />;

  if (fetchError || (!staffMember && !fetching)) {
    return (
      <div className={styles.page}>
        <Alert variant="error" message={fetchError || 'Staff member not found'} />
        <Button variant="secondary" onClick={() => router.push('/staff')} style={{ marginTop: 16 }}>
          Back to Staff
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button type="button" onClick={() => router.push('/staff')} className={styles.backButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Staff
      </button>

      <Card title="Edit Staff Member">
        {success && <Alert variant="success" message="Staff member updated successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input label="Full Name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={fieldErrors['fullName']} />
          <Input label="Email" required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={fieldErrors['email']} />
          <Input label="Phone Number" required type="tel" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} error={fieldErrors['phoneNumber']} placeholder="+919876543210" hint="E.164 format with country code" />

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Contact Information</h4>
            <div className={styles.sectionFields}>
              <Input label="Mobile Number" type="tel" value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)} error={fieldErrors['mobileNumber']} placeholder="+919876543210" hint="E.164 format with +91 prefix" />
              <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} error={fieldErrors['address']} placeholder="Full address (optional)" hint="Max 300 characters" />
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Change Password</h4>
            <div className={styles.sectionFields}>
              <Input label="New Password (optional)" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} error={fieldErrors['password']} placeholder="Leave blank to keep current" hint="Min 8 characters" />
            </div>
          </div>

          <DatePicker label="Start Date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />

          <div>
            <label className={styles.fieldLabel}>Gender</label>
            <div className={styles.chipGroup}>
              {GENDER_OPTIONS.map((g) => (
                <Chip key={g.value} label={g.label} selected={form.gender === g.value} onSelect={() => set('gender', g.value)} />
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Qualification & Position</h4>
            <div className={styles.sectionFields}>
              <Input label="Qualification" value={form.qualification} onChange={(e) => set('qualification', e.target.value)} />
              <Input label="Position" value={form.position} onChange={(e) => set('position', e.target.value)} />
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Salary Details</h4>
            <div className={styles.gridRow}>
              <Input label="Salary Amount" type="number" value={form.salaryAmount} onChange={(e) => set('salaryAmount', e.target.value)} error={fieldErrors['salaryAmount']} min={0} />
              <Select label="Frequency" options={SALARY_FREQUENCIES} value={form.salaryFrequency} onChange={(e) => set('salaryFrequency', e.target.value)} />
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => router.push('/staff')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Update Staff</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
