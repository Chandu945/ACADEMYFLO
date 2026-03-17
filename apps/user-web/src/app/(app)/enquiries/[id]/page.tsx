'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEnquiryDetail, addFollowUp, closeEnquiry, convertEnquiry } from '@/application/enquiries/use-enquiries';
import { useAuth } from '@/application/auth/use-auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from './page.module.css';

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'ACTIVE': return 'success' as const;
    case 'CLOSED': return 'default' as const;
    case 'CONVERTED': return 'primary' as const;
    default: return 'default' as const;
  }
}

export default function EnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { data: enquiry, loading, refetch } = useEnquiryDetail(params.id);

  const [followUpNotes, setFollowUpNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, _setCloseReason] = useState('');
  const [closing, setClosing] = useState(false);

  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleAddFollowUp = useCallback(async () => {
    if (!followUpNotes.trim()) { setFollowUpError('Notes are required'); return; }
    setAddingFollowUp(true);
    setFollowUpError(null);
    const result = await addFollowUp(params.id, {
      notes: followUpNotes.trim(),
      nextFollowUpDate: nextFollowUpDate || undefined,
    }, accessToken);
    setAddingFollowUp(false);
    if (!result.ok) { setFollowUpError(result.error); return; }
    setFollowUpNotes('');
    setNextFollowUpDate('');
    refetch();
  }, [followUpNotes, nextFollowUpDate, params.id, accessToken, refetch]);

  const handleClose = useCallback(async () => {
    setClosing(true);
    await closeEnquiry(params.id, closeReason, accessToken);
    setClosing(false);
    setCloseOpen(false);
    refetch();
  }, [params.id, closeReason, accessToken, refetch]);

  const handleConvert = useCallback(async () => {
    setConverting(true);
    const result = await convertEnquiry(params.id, {}, accessToken);
    setConverting(false);
    if (result.ok) {
      router.push('/enquiries');
    }
    setConvertOpen(false);
  }, [params.id, accessToken, router]);

  if (loading) return <Spinner centered size="lg" />;
  if (!enquiry) return <Alert variant="error" message="Enquiry not found" />;

  return (
    <div className={styles.page}>
      <button className={styles.backButton} onClick={() => router.push('/enquiries')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Enquiries
      </button>

      {/* Detail Header */}
      <div className={styles.detailHeader}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.enquiryName}>{enquiry.prospectName}</h1>
            <Badge variant={statusBadgeVariant(enquiry.status)} dot>{enquiry.status}</Badge>
          </div>
          <div className={styles.actions}>
            {enquiry.status === 'ACTIVE' && (
              <>
                <Button variant="primary" size="sm" onClick={() => setConvertOpen(true)}>Convert to Student</Button>
                <Button variant="outline" size="sm" onClick={() => setCloseOpen(true)}>Close</Button>
              </>
            )}
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Mobile</span>
            <span className={styles.infoValue}>{enquiry.mobileNumber}</span>
          </div>
          {enquiry.email && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{enquiry.email}</span>
            </div>
          )}
          {enquiry.guardianName && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Guardian</span>
              <span className={styles.infoValue}>{enquiry.guardianName}</span>
            </div>
          )}
          {enquiry.source && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Source</span>
              <span className={styles.infoValue}>{enquiry.source}</span>
            </div>
          )}
          {enquiry.interestedIn && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Interested In</span>
              <span className={styles.infoValue}>{enquiry.interestedIn}</span>
            </div>
          )}
          {enquiry.nextFollowUpDate && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Next Follow-up</span>
              <span className={styles.infoValue}>{new Date(enquiry.nextFollowUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
          {enquiry.notes && (
            <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
              <span className={styles.infoLabel}>Notes</span>
              <span className={styles.infoValue}>{enquiry.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Follow-up Timeline */}
      <div className={styles.timelineSection}>
        <h2 className={styles.sectionTitle}>Follow-up History</h2>
        {enquiry.followUps.length === 0 ? (
          <EmptyState message="No follow-ups yet" subtitle="Add a follow-up below" />
        ) : (
          <div className={styles.timeline}>
            {enquiry.followUps.map((fu) => (
              <div key={fu.id} className={styles.timelineItem}>
                <div className={styles.timelineDate}>
                  {new Date(fu.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className={styles.timelineNotes}>{fu.notes}</div>
                {fu.nextFollowUpDate && (
                  <div className={styles.timelineNext}>
                    Next follow-up: {new Date(fu.nextFollowUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Follow-up Form */}
      {enquiry.status === 'ACTIVE' && (
        <div className={styles.followUpForm}>
          <h2 className={styles.sectionTitle}>Add Follow-up</h2>
          {followUpError && <Alert variant="error" message={followUpError} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Input label="Notes" required value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} placeholder="Follow-up notes" />
            <DatePicker label="Next Follow-up Date" value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" loading={addingFollowUp} onClick={handleAddFollowUp}>Add Follow-up</Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Dialog */}
      <ConfirmDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={handleClose}
        title="Close Enquiry"
        message="Are you sure you want to close this enquiry?"
        confirmLabel="Close Enquiry"
        loading={closing}
      />

      {/* Convert Dialog */}
      <ConfirmDialog
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        onConfirm={handleConvert}
        title="Convert to Student"
        message={`Convert "${enquiry.prospectName}" to a student?`}
        confirmLabel="Convert"
        loading={converting}
      />
    </div>
  );
}
