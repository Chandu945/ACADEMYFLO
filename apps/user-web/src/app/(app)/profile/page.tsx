'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

export default function ProfilePage() {
  const { user, accessToken } = useAuth();

  const [editForm, setEditForm] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  });
  useEffect(() => {
    if (user) {
      setEditForm({ fullName: user.fullName ?? '', email: user.email ?? '', phoneNumber: user.phoneNumber ?? '' });
    }
  }, [user]);

  const [saving, setSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    setEditError(null);
    setEditSuccess(false);
    if (!editForm.fullName.trim()) {
      setEditError('Full name is required');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          fullName: editForm.fullName.trim(),
          email: editForm.email.trim(),
          phoneNumber: editForm.phoneNumber.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setEditError(json.message || 'Failed to update profile');
      } else {
        setEditSuccess(true);
        setTimeout(() => setEditSuccess(false), 4000);
      }
    } catch {
      setEditError('Network error');
    } finally {
      setSaving(false);
    }
  }, [editForm, accessToken]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword) { setPasswordError('Current password is required'); return; }
    if (passwordForm.newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('Passwords do not match'); return; }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setPasswordError(json.message || 'Failed to change password');
      } else {
        setPasswordSuccess(true);
        setTimeout(() => setPasswordSuccess(false), 4000);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      setPasswordError('Network error');
    } finally {
      setChangingPassword(false);
    }
  }, [passwordForm, accessToken]);

  if (!user) return <Spinner centered size="lg" />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile</h1>

      {/* Profile Card */}
      <div className={styles.profileCard}>
        <Avatar src={user?.profilePhotoUrl} name={user?.fullName} size="xl" />
        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{user?.fullName ?? 'User'}</div>
          <div style={{ marginBottom: '8px' }}>
            <Badge variant="primary">{user?.role ?? 'OWNER'}</Badge>
          </div>
          <div className={styles.profileMeta}>
            <div className={styles.profileMetaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              <span>{user?.email ?? '-'}</span>
            </div>
            <div className={styles.profileMetaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span>{user?.phoneNumber ?? '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Edit Profile</h2>
        {editSuccess && <Alert variant="success" message="Profile updated successfully" />}
        {editError && <Alert variant="error" message={editError} />}
        <div className={styles.form}>
          <Input
            label="Full Name"
            value={editForm.fullName}
            onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            label="Phone Number"
            type="tel"
            value={editForm.phoneNumber}
            onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
          />
          <div className={styles.saveRow}>
            <Button variant="primary" loading={saving} onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        {passwordSuccess && <Alert variant="success" message="Password changed successfully" />}
        {passwordError && <Alert variant="error" message={passwordError} />}
        <div className={styles.form}>
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            hint="Minimum 6 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
          <div className={styles.saveRow}>
            <Button variant="primary" loading={changingPassword} onClick={handleChangePassword}>Change Password</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
