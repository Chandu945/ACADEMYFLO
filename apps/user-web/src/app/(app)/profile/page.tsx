'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

export default function ProfilePage() {
  const { user, accessToken, refreshAuth } = useAuth();

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

  // ── Photo Upload State ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(user?.profilePhotoUrl);

  useEffect(() => {
    if (user?.profilePhotoUrl) {
      setAvatarUrl(user.profilePhotoUrl);
    }
  }, [user?.profilePhotoUrl]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError('Please select a JPG, PNG, or GIF image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setPhotoError('Image must be less than 5 MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadPhoto = useCallback(async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(false);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);

      // TODO: Create /api/uploads/image BFF route that proxies to the backend upload endpoint.
      // For now, this calls the placeholder path. Once the BFF route is implemented, this will work.
      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        let msg = 'Failed to upload photo';
        try { const json = await res.json(); msg = json.message || msg; } catch { /* non-JSON */ }
        setPhotoError(msg);
        return;
      }

      const data = await res.json();
      const uploadedUrl = data.url || data.imageUrl;
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
      }

      // Update the profile with the new photo URL
      if (uploadedUrl) {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ profilePhotoUrl: uploadedUrl }),
        });
      }

      setPhotoSuccess(true);
      setPhotoFile(null);
      setPhotoPreview(null);
      setTimeout(() => setPhotoSuccess(false), 4000);

      // Refresh auth to update the user object with new photo
      refreshAuth().catch(() => { /* silent */ });
    } catch {
      setPhotoError('Network error uploading photo.');
    } finally {
      setUploadingPhoto(false);
      // Reset file input so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [photoFile, accessToken, refreshAuth]);

  const handleCancelPhoto = useCallback(() => {
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

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
        let msg = 'Failed to update profile';
        try { const json = await res.json(); msg = json.message || msg; } catch { /* non-JSON */ }
        setEditError(msg);
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
    if (passwordForm.newPassword.length < 8) { setPasswordError('New password must be at least 8 characters'); return; }
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
        let msg = 'Failed to change password';
        try { const json = await res.json(); msg = json.message || msg; } catch { /* non-JSON */ }
        setPasswordError(msg);
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
        <div className={styles.avatarContainer}>
          <button
            type="button"
            className={styles.avatarButton}
            onClick={handleAvatarClick}
            aria-label="Change profile photo"
          >
            <Avatar
              src={photoPreview ?? avatarUrl}
              name={user?.fullName}
              size="xl"
            />
            <span className={styles.avatarOverlay}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className={styles.fileInput}
            onChange={handleFileChange}
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Photo upload actions */}
          {photoPreview && (
            <div className={styles.photoActions}>
              <Button
                variant="primary"
                size="sm"
                loading={uploadingPhoto}
                onClick={handleUploadPhoto}
              >
                Upload
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelPhoto}
                disabled={uploadingPhoto}
              >
                Cancel
              </Button>
            </div>
          )}
          {photoError && <div className={styles.photoError}>{photoError}</div>}
          {photoSuccess && <div className={styles.photoSuccess}>Photo updated!</div>}
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{user?.fullName ?? 'User'}</div>
          <div className={styles.roleBadge}>
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
            hint="Minimum 8 characters"
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
