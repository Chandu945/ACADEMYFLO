'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStudent } from '@/application/students/use-students';
import { useBatches } from '@/application/batches/use-batches';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import styles from './page.module.css';

import { GENDERS } from '@academyflo/contracts';
const GENDER_OPTIONS = GENDERS.map((g) => ({ value: g, label: g.charAt(0) + g.slice(1).toLowerCase() }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;
const PINCODE_RE = /^\d{6}$/;

/** Normalize a phone input to E.164 (+91XXXXXXXXXX). Returns the input as-is if already E.164 or empty. */
function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  // If digits only (10 digits), prepend +91
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return trimmed;
}

export default function NewStudentPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: batches } = useBatches();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const formRef = useRef({
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
    joiningDate: new Date().toISOString().split('T')[0]!,
    monthlyFee: '',
    batchId: '',
    addressLine1: '',
    addressCity: '',
    addressState: '',
    addressPincode: '',
  });

  const [form, setForm] = useState({ ...formRef.current });

  // Cleanup redirect timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(formRef.current);

  // Warn on unsaved changes
  useEffect(() => {
    if (!isDirty || success) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
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
    if (!form.gender) errors['gender'] = 'Gender is required';
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
    if (!form.joiningDate) errors['joiningDate'] = 'Joining date is required';
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
    const result = await createStudent(
      {
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
        joiningDate: form.joiningDate,
        monthlyFee: Number(form.monthlyFee),
        batchId: form.batchId || undefined,
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
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    setSuccess(true);
    redirectTimer.current = setTimeout(() => router.push('/students'), 1200);
  }, [form, accessToken, router, validate]);

  const batchOptions = batches
    .filter((b) => b.status === 'ACTIVE')
    .map((b) => ({ value: b.id, label: b.batchName }));

  return (
    <div className={styles.page}>
      <button
        type="button"
        onClick={() => router.push('/students')}
        className={styles.backButton}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Students
      </button>

      <Card title="Add New Student">
        {success && <Alert variant="success" message="Student created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          {/* Student Information */}
          <Input
            label="Full Name"
            required
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            error={fieldErrors['fullName']}
            placeholder="Enter student's full name"
          />

          <DatePicker
            label="Date of Birth"
            value={form.dateOfBirth}
            onChange={(e) => set('dateOfBirth', e.target.value)}
          />

          <div>
            <label className={styles.fieldLabel}>
              Gender <span className={styles.required}>*</span>
            </label>
            <div className={styles.chipGroup}>
              {GENDER_OPTIONS.map((g) => (
                <Chip key={g.value} label={g.label} selected={form.gender === g.value} onSelect={() => set('gender', g.value)} />
              ))}
            </div>
            {fieldErrors['gender'] && (
              <span className={styles.fieldError} role="alert">{fieldErrors['gender']}</span>
            )}
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
            </div>
          </div>

          {/* Guardian Information */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Guardian Information</h4>
            <div className={styles.sectionFields}>
              <Input
                label="Guardian Name"
                required
                value={form.guardianName}
                onChange={(e) => set('guardianName', e.target.value)}
                error={fieldErrors['guardianName']}
                placeholder="Guardian's full name"
              />
              <Input
                label="Guardian Mobile"
                required
                type="tel"
                value={form.guardianMobile}
                onChange={(e) => set('guardianMobile', e.target.value)}
                error={fieldErrors['guardianMobile']}
                placeholder="+919876543210"
                hint="E.164 format with country code"
              />
              <Input
                label="Guardian Email"
                type="email"
                value={form.guardianEmail}
                onChange={(e) => set('guardianEmail', e.target.value)}
                error={fieldErrors['guardianEmail']}
                placeholder="Guardian's email (optional)"
              />
            </div>
          </div>

          {/* Academy Details */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Academy Details</h4>
            <div className={styles.sectionFields}>
              <DatePicker
                label="Joining Date"
                required
                value={form.joiningDate}
                onChange={(e) => set('joiningDate', e.target.value)}
                error={fieldErrors['joiningDate']}
              />
              <Input
                label="Monthly Fee"
                required
                type="number"
                value={form.monthlyFee}
                onChange={(e) => set('monthlyFee', e.target.value)}
                error={fieldErrors['monthlyFee']}
                placeholder="e.g. 2000"
                min={1}
              />
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
              <Input
                label="Address Line"
                value={form.addressLine1}
                onChange={(e) => set('addressLine1', e.target.value)}
                placeholder="Street address"
              />
              <div className={styles.gridRow}>
                <Input
                  label="City"
                  value={form.addressCity}
                  onChange={(e) => set('addressCity', e.target.value)}
                  placeholder="City"
                />
                <Input
                  label="State"
                  value={form.addressState}
                  onChange={(e) => set('addressState', e.target.value)}
                  placeholder="State"
                />
              </div>
              <Input
                label="Pincode"
                value={form.addressPincode}
                onChange={(e) => set('addressPincode', e.target.value)}
                error={fieldErrors['addressPincode']}
                placeholder="Pincode"
                maxLength={6}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => router.push('/students')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>
              Create Student
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
