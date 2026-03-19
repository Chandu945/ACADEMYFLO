'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createEnquiry } from '@/application/enquiries/use-enquiries';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const SOURCE_OPTIONS = [
  { value: '', label: 'Select Source' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewEnquiryPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.prospectName.trim()) errors.prospectName = 'Name is required';
    if (!form.mobileNumber.trim()) errors.mobileNumber = 'Mobile number is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/enquiries'), 1200);
  }, [form, accessToken, router]);

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '680px' }}>
      <button
        onClick={() => router.push('/enquiries')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: '24px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Enquiries
      </button>

      <Card title="New Enquiry">
        {success && <Alert variant="success" message="Enquiry created successfully! Redirecting..." />}
        {error && <Alert variant="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Input label="Prospect Name" required value={form.prospectName} onChange={(e) => set('prospectName', e.target.value)} error={fieldErrors.prospectName} placeholder="Full name" />
          <Input label="Mobile Number" required type="tel" value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)} error={fieldErrors.mobileNumber} placeholder="10-digit mobile" />
          <Input label="Guardian Name" value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} placeholder="Optional" />
          <Input label="WhatsApp Number" type="tel" value={form.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="Optional" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional" />
          <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Optional" />
          <Select label="Source" options={SOURCE_OPTIONS} value={form.source} onChange={(e) => set('source', e.target.value)} />
          <Input label="Interested In" value={form.interestedIn} onChange={(e) => set('interestedIn', e.target.value)} placeholder="e.g. Cricket coaching, Badminton" />
          <Input label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes" />
          <DatePicker label="Next Follow-up Date" value={form.nextFollowUpDate} onChange={(e) => set('nextFollowUpDate', e.target.value)} />

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <Button type="button" variant="outline" onClick={() => router.push('/enquiries')}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={success}>Create Enquiry</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
