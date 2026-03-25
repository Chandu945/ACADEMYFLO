'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/application/auth/use-auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import styles from './page.module.css';

interface FormData {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface FieldErrors {
  name?: string;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Academy name is required';
  } else if (form.name.trim().length > 100) {
    errors.name = 'Academy name must be 100 characters or less';
  }

  if (!form.line1.trim()) {
    errors.line1 = 'Address line 1 is required';
  }

  if (!form.city.trim()) {
    errors.city = 'City is required';
  }

  if (!form.state.trim()) {
    errors.state = 'State is required';
  }

  if (!form.pincode.trim()) {
    errors.pincode = 'Pincode is required';
  } else if (!/^\d{6}$/.test(form.pincode.trim())) {
    errors.pincode = 'Pincode must be exactly 6 digits';
  }

  return errors;
}

export default function AcademySetupPage() {
  const router = useRouter();
  const { accessToken, logout } = useAuth();

  const [form, setForm] = useState<FormData>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear field error on change
      setFieldErrors((prev) => {
        if (!prev[field as keyof FieldErrors]) return prev;
        const next = { ...prev };
        delete next[field as keyof FieldErrors];
        return next;
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setApiError(null);

      const errors = validate(form);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      setFieldErrors({});
      setSubmitting(true);

      try {
        const res = await fetch('/api/academy/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            name: form.name.trim(),
            address: {
              line1: form.line1.trim(),
              line2: form.line2.trim() || undefined,
              city: form.city.trim(),
              state: form.state.trim(),
              pincode: form.pincode.trim(),
              country: form.country,
            },
          }),
        });

        if (!res.ok) {
          let msg = 'Failed to set up academy';
          try {
            const json = await res.json();
            msg = json.message || msg;
          } catch {
            /* non-JSON */
          }
          setApiError(msg);
        } else {
          router.replace('/dashboard');
        }
      } catch {
        setApiError('Network error. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [form, accessToken, router],
  );

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <div className={styles.stepIndicator}>Step 2 of 2</div>
          <h1 className={styles.title}>Set Up Your Academy</h1>
          <p className={styles.subtitle}>
            Enter your academy details to complete your account setup.
          </p>
        </div>

        {apiError && <Alert variant="error" message={apiError} onDismiss={() => setApiError(null)} />}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="Academy Name"
            required
            value={form.name}
            onChange={handleChange('name')}
            error={fieldErrors.name}
            placeholder="e.g. Star Cricket Academy"
            maxLength={100}
          />

          <div className={styles.divider} />

          <Input
            label="Address Line 1"
            required
            value={form.line1}
            onChange={handleChange('line1')}
            error={fieldErrors.line1}
            placeholder="Street address"
          />

          <Input
            label="Address Line 2"
            value={form.line2}
            onChange={handleChange('line2')}
            placeholder="Apartment, suite, etc. (optional)"
          />

          <div className={styles.row}>
            <Input
              label="City"
              required
              value={form.city}
              onChange={handleChange('city')}
              error={fieldErrors.city}
              placeholder="City"
            />
            <Input
              label="State"
              required
              value={form.state}
              onChange={handleChange('state')}
              error={fieldErrors.state}
              placeholder="State"
            />
          </div>

          <div className={styles.row}>
            <Input
              label="Pincode"
              required
              value={form.pincode}
              onChange={handleChange('pincode')}
              error={fieldErrors.pincode}
              placeholder="6-digit pincode"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <Input
              label="Country"
              value={form.country}
              disabled
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            className={styles.submitButton}
          >
            Complete Setup
          </Button>
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.logoutLink} onClick={logout}>
            Log out
          </button>
        </div>
      </Card>
    </div>
  );
}
