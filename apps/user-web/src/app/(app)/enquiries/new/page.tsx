'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createEnquiry } from '@/application/enquiries/use-enquiries';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

const SOURCES = [
  { value: '', label: 'Select Source' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTHER', label: 'Other' },
];

const MOBILE_RE = /^\d{10,15}$/;

export default function NewEnquiryPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [form, setForm] = useState({
    prospectName: '',
    mobileNumber: '',
    guardianName: '',
    whatsappNumber: '',
    email: '',
    address: '',
    source: '',
    interestedIn: '',
    notes: '',
    nextFollowUpDate: '',
  });

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  const isDirty = form.prospectName || form.mobileNumber;

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
    if (!form.prospectName.trim()) errors['prospectName'] = 'Prospect name is required';
    if (!form.mobileNumber.trim()) {
      errors['mobileNumber'] = 'Mobile number is required';
    } else if (!MOBILE_RE.test(form.mobileNumber.trim())) {
      errors['mobileNumber'] = 'Must be 10-15 digits';
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
    const result = await createEnquiry(
      {
        prospectName: form.prospectName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        guardianName: form.guardianName.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        source: form.source || undefined,
        interestedIn: form.interestedIn.trim() || undefined,
        notes: form.notes.trim() || undefined,
        nextFollowUpDate: form.nextFollowUpDate || undefined,
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
    redirectTimer.current = setTimeout(() => router.push('/enquiries'), 1200);
  }, [form, accessToken, router, validate]);

  return (
    <div className={styles.page}>
      <button type="button" onClick={() => router.push('/enquiries')} className={styles.backButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Enquiries
      </button>

      <Card title="New Enquiry">
        {success && <Alert variant="success" message="Enquiry created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input label="Prospect Name" required value={form.prospectName} onChange={(e) => set('prospectName', e.target.value)} error={fieldErrors['prospectName']} placeholder="Full name" />
          <Input label="Mobile Number" required type="tel" value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)} error={fieldErrors['mobileNumber']} placeholder="10-15 digits" />
          <Input label="Guardian Name" value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} placeholder="Parent/Guardian name" />
          <Input label="WhatsApp Number" type="tel" value={form.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="If different from mobile" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email address" />
          <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Address" />
          <Select label="Source" options={SOURCES} value={form.source} onChange={(e) => set('source', e.target.value)} />
          <Input label="Interested In" value={form.interestedIn} onChange={(e) => set('interestedIn', e.target.value)} placeholder="e.g. Cricket Coaching" />
          <Input label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Initial notes" />
          <DatePicker label="Next Follow-Up Date" value={form.nextFollowUpDate} onChange={(e) => set('nextFollowUpDate', e.target.value)} />

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => router.push('/enquiries')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Create Enquiry</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
