'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useEventDetail,
  deleteEvent,
  useEventGallery,
  uploadGalleryPhoto,
  deleteGalleryPhoto,
} from '@/application/events/use-events';
import type { GalleryPhoto } from '@/application/events/use-events';
import { useAuth } from '@/application/auth/use-auth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import styles from './page.module.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'UPCOMING': return 'info' as const;
    case 'ONGOING': return 'primary' as const;
    case 'COMPLETED': return 'success' as const;
    case 'CANCELLED': return 'danger' as const;
    default: return 'default' as const;
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { data: event, loading, error, refetch } = useEventDetail(params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Gallery state
  const {
    photos,
    loading: galleryLoading,
    error: galleryError,
    refetch: refetchGallery,
  } = useEventGallery(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [photoDeleteId, setPhotoDeleteId] = useState<string | null>(null);
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const [photoDeleteError, setPhotoDeleteError] = useState<string | null>(null);

  const canManageGallery = user?.role === 'OWNER' || user?.role === 'STAFF';

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteEvent(params.id, accessToken);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error || 'Failed to delete event');
      return;
    }
    setDeleteOpen(false);
    router.push('/events');
  }, [params.id, accessToken, router]);

  // Gallery handlers
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP files are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size must be under 5 MB.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    const result = await uploadGalleryPhoto(params.id, selectedFile, caption || undefined, accessToken);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    setSelectedFile(null);
    setCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    refetchGallery();
  }, [selectedFile, caption, params.id, accessToken, refetchGallery]);

  const handleCancelUpload = useCallback(() => {
    setSelectedFile(null);
    setCaption('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handlePhotoDelete = useCallback(async () => {
    if (!photoDeleteId) return;
    setPhotoDeleting(true);
    setPhotoDeleteError(null);
    const result = await deleteGalleryPhoto(params.id, photoDeleteId, accessToken);
    setPhotoDeleting(false);
    if (!result.ok) {
      setPhotoDeleteError(result.error);
      return;
    }
    setPhotoDeleteId(null);
    refetchGallery();
  }, [photoDeleteId, params.id, accessToken, refetchGallery]);

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
  }, []);

  if (loading) return <Spinner centered size="lg" />;
  if (error) return (
    <div className={styles.page}>
      <Alert variant="error" message={error} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <Button onClick={refetch}>Retry</Button>
        <Button variant="secondary" onClick={() => router.push('/events')}>Back to Events</Button>
      </div>
    </div>
  );
  if (!event) return (
    <div className={styles.page}>
      <Alert variant="error" message="Event not found" />
      <Button variant="secondary" onClick={() => router.push('/events')} style={{ marginTop: 16 }}>Back to Events</Button>
    </div>
  );

  const viewerPhotos = photos.map((p: GalleryPhoto) => ({ id: p.id, url: p.url, caption: p.caption }));

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => router.push('/events')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Events
      </button>

      <Card>
        <div className={styles.detailHeader}>
          <div>
            <h1 className={styles.eventTitle}>{event.title}</h1>
            <div className={styles.badgeRow}>
              <Badge variant={statusBadgeVariant(event.status)}>{event.status}</Badge>
              {event.eventType && <Badge variant="primary">{event.eventType}</Badge>}
              {event.isAllDay && <Badge variant="info">All Day</Badge>}
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button variant="outline" onClick={() => router.push(`/events/${params.id}/edit`)}>Edit</Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {event.description && (
            <div>
              <h4 className={styles.infoLabel}>Description</h4>
              <p className={styles.infoValue}>{event.description}</p>
            </div>
          )}

          <div className={styles.infoGrid}>
            <div>
              <h4 className={styles.infoLabel}>Start Date</h4>
              <p className={styles.infoValue}>{formatDate(event.startDate)}</p>
            </div>
            {event.endDate && (
              <div>
                <h4 className={styles.infoLabel}>End Date</h4>
                <p className={styles.infoValue}>{formatDate(event.endDate)}</p>
              </div>
            )}
            {event.startTime && (
              <div>
                <h4 className={styles.infoLabel}>Time</h4>
                <p className={styles.infoValue}>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</p>
              </div>
            )}
            {event.location && (
              <div>
                <h4 className={styles.infoLabel}>Location</h4>
                <p className={styles.infoValue}>{event.location}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Photo Gallery Section */}
      <Card>
        <div className={styles.gallerySection}>
          <div className={styles.gallerySectionHeader}>
            <h2 className={styles.gallerySectionTitle}>
              Photo Gallery
              <span className={styles.photoCount}>({photos.length} photo{photos.length !== 1 ? 's' : ''})</span>
            </h2>
            {canManageGallery && !selectedFile && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= 50}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Upload Photo
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          {canManageGallery && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          )}

          {/* Upload area when file is selected */}
          {selectedFile && (
            <div>
              <div className={styles.selectedFileInfo}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className={styles.selectedFileName}>{selectedFile.name}</span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <div className={styles.captionInputRow} style={{ marginTop: 'var(--space-3)' }}>
                <input
                  className={styles.captionInput}
                  type="text"
                  placeholder="Add a caption (optional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={200}
                  disabled={uploading}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button variant="secondary" onClick={handleCancelUpload} disabled={uploading}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload error */}
          {uploadError && <Alert variant="error" message={uploadError} />}

          {/* Gallery loading */}
          {galleryLoading && <Spinner centered size="sm" />}

          {/* Gallery error */}
          {galleryError && (
            <Alert variant="error" message={galleryError} />
          )}

          {/* Photo grid */}
          {!galleryLoading && photos.length > 0 && (
            <div className={styles.galleryGrid}>
              {photos.map((photo: GalleryPhoto, index: number) => (
                <div
                  key={photo.id}
                  className={styles.photoCard}
                  onClick={() => openViewer(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(index); } }}
                  aria-label={photo.caption || `Photo ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.photoImage}
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    loading="lazy"
                  />
                  <div className={styles.photoOverlay}>
                    {photo.caption && (
                      <span className={styles.photoCaption}>{photo.caption}</span>
                    )}
                    {canManageGallery && (
                      <button
                        type="button"
                        className={styles.deletePhotoButton}
                        onClick={(e) => { e.stopPropagation(); setPhotoDeleteId(photo.id); }}
                        aria-label="Delete photo"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!galleryLoading && !galleryError && photos.length === 0 && (
            <div className={styles.galleryEmpty}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: 8 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p>No photos yet.{canManageGallery ? ' Upload the first photo!' : ''}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Photo Viewer Modal */}
      {viewerIndex !== null && (
        <PhotoViewer
          photos={viewerPhotos}
          currentIndex={viewerIndex}
          onClose={closeViewer}
          onNavigate={setViewerIndex}
        />
      )}

      {/* Delete Event Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${event.title}"?`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      >
        {deleteError && <Alert variant="error" message={deleteError} />}
      </ConfirmDialog>

      {/* Delete Photo Confirm */}
      <ConfirmDialog
        open={photoDeleteId !== null}
        onClose={() => { setPhotoDeleteId(null); setPhotoDeleteError(null); }}
        onConfirm={handlePhotoDelete}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={photoDeleting}
      >
        {photoDeleteError && <Alert variant="error" message={photoDeleteError} />}
      </ConfirmDialog>
    </div>
  );
}
