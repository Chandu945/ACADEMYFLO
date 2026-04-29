'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudentDetail, updateStudent } from '@/application/students/use-students';
import { useBatches } from '@/application/batches/use-batches';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

import { GENDERS } from '@academyflo/contracts';
const GENDER_OPTIONS = GENDERS.map((g) => ({ value: g, label: g.charAt(0) + g.slice(1).toLowerCase() }));

/** Safely convert any date string to YYYY-MM-DD for HTML date input */
function toDateInputValue(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw.includes('T')) { const p = raw.split('T')[0]; if (p && /^\d{4}-\d{2}-\d{2}$/.test(p)) return p; }
  const d = new Date(raw);
  return !isNaN(d.getTime()) ? d.toISOString().split('T')[0]! : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;
const PINCODE_RE = /^\d{6}$/;

/** Normalize a phone input to E.164 (+91XXXXXXXXXX). Returns the input as-is if already E.164 or empty. */
function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return trimmed;
}

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { data: student, loading: fetching, error: fetchError } = useStudentDetail(params.id);
  const { data: batches } = useBatches();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialFormRef = useRef<Record<string, string> | null>(null);

  const isStaff = user?.role === 'STAFF';

  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    guardianName: '',
    guardianMobile: '',
    guardianEmail: '',
    fatherName: '',
    motherName: '',
    whatsappNumber: '',
    mobileNumber: '',
    joiningDate: '',
    monthlyFee: '',
    batchId: '',
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
        dateOfBirth: student.dateOfBirth ? toDateInputValue(student.dateOfBirth) : '',
        gender: (student.gender ?? '').toUpperCase(),
        guardianName: student.guardian?.name ?? '',
        guardianMobile: student.guardian?.mobile ?? '',
        guardianEmail: student.guardian?.email ?? '',
        fatherName: student.fatherName ?? '',
        motherName: student.motherName ?? '',
        whatsappNumber: student.whatsappNumber ?? '',
        mobileNumber: student.mobileNumber ?? '',
        joiningDate: student.joiningDate ? toDateInputValue(student.joiningDate) : '',
        monthlyFee: String(student.monthlyFee ?? ''),
        batchId: student.batchId ?? '',
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
    } else if (!E164_RE.test(normalizePhone(form.guardianMobile))) {
      errors['guardianMobile'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (form.guardianEmail.trim() && !EMAIL_RE.test(form.guardianEmail.trim())) {
      errors['guardianEmail'] = 'Invalid email format';
    }
    if (form.fatherName.trim() && form.fatherName.trim().length > 100) {
      errors['fatherName'] = 'Father name must be 100 characters or less';
    }
    if (form.motherName.trim() && form.motherName.trim().length > 100) {
      errors['motherName'] = 'Mother name must be 100 characters or less';
    }
    if (form.whatsappNumber.trim() && !E164_RE.test(normalizePhone(form.whatsappNumber))) {
      errors['whatsappNumber'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (form.mobileNumber.trim() && !E164_RE.test(normalizePhone(form.mobileNumber))) {
      errors['mobileNumber'] = 'Must be in E.164 format (e.g. +919876543210)';
    }
    if (!isStaff && (!form.monthlyFee || Number(form.monthlyFee) <= 0)) {
      errors['monthlyFee'] = 'Monthly fee must be greater than 0';
    }
    if (form.addressPincode.trim() && !PINCODE_RE.test(form.addressPincode.trim())) {
      errors['addressPincode'] = 'Pincode must be 5-6 digits';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, isStaff]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!validate()) return;

    setLoading(true);
    const payload: Record<string, unknown> = {
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      guardian: {
        name: form.guardianName.trim(),
        mobile: normalizePhone(form.guardianMobile),
        email: form.guardianEmail.trim() || undefined,
      },
      fatherName: form.fatherName.trim() || undefined,
      motherName: form.motherName.trim() || undefined,
      whatsappNumber: normalizePhone(form.whatsappNumber) || undefined,
      mobileNumber: normalizePhone(form.mobileNumber) || undefined,
      joiningDate: form.joiningDate || undefined,
      batchId: form.batchId || undefined,
      address: form.addressLine1.trim() ? {
        line1: form.addressLine1.trim(),
        city: form.addressCity.trim() || undefined,
        state: form.addressState.trim() || undefined,
        pincode: form.addressPincode.trim() || undefined,
      } : undefined,
    };
    if (!isStaff) {
      payload.monthlyFee = Number(form.monthlyFee);
    }
    const result = await updateStudent(params.id, payload, accessToken);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    redirectTimer.current = setTimeout(() => router.push(`/students/${params.id}`), 1200);
  }, [form, accessToken, router, params.id, validate, isStaff]);

  const batchOptions = batches
    .filter((b) => b.status === 'ACTIVE')
    .map((b) => ({ value: b.id, label: b.batchName }));

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
              {GENDER_OPTIONS.map((g) => (
                <Chip key={g.value} label={g.label} selected={form.gender === g.value} onSelect={() => set('gender', g.value)} />
              ))}
            </div>
          </div>

          {/* Family Information */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Family Information</h4>
            <div className={styles.sectionFields}>
              <div className={styles.gridRow}>
                <Input
                  label="Father Name"
                  value={form.fatherName}
                  onChange={(e) => set('fatherName', e.target.value)}
                  error={fieldErrors['fatherName']}
                  placeholder="Father's name (optional)"
                  maxLength={100}
                />
                <Input
                  label="Mother Name"
                  value={form.motherName}
                  onChange={(e) => set('motherName', e.target.value)}
                  error={fieldErrors['motherName']}
                  placeholder="Mother's name (optional)"
                  maxLength={100}
                />
              </div>
              <Input
                label="Mobile Number"
                type="tel"
                value={form.mobileNumber}
                onChange={(e) => set('mobileNumber', e.target.value)}
                error={fieldErrors['mobileNumber']}
                placeholder="+919876543210"
                hint="E.164 format with +91 prefix"
              />
              <Input
                label="WhatsApp Number"
                type="tel"
                value={form.whatsappNumber}
                onChange={(e) => set('whatsappNumber', e.target.value)}
                error={fieldErrors['whatsappNumber']}
                placeholder="+919876543210"
                hint="Optional. Leave blank to use the mobile number for WhatsApp."
              />
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
              {!isStaff && (
                <Input label="Monthly Fee" required type="number" value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} error={fieldErrors['monthlyFee']} min={1} />
              )}
              <Select
                label="Batch"
                options={batchOptions}
                value={form.batchId}
                onChange={(e) => set('batchId', e.target.value)}
                placeholder="Select a batch (optional)"
              />
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
