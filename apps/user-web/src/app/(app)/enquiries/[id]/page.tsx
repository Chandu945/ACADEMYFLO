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
import { Modal } from '@/components/ui/Modal';
import styles from './page.module.css';

const CLOSE_REASONS = ['CONVERTED', 'NOT_INTERESTED', 'OTHER'] as const;
type CloseReasonType = (typeof CLOSE_REASONS)[number];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

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
  const [closeReasonType, setCloseReasonType] = useState<CloseReasonType | ''>('');
  const [closeCustomReason, setCloseCustomReason] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertJoiningDate, setConvertJoiningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [convertMonthlyFee, setConvertMonthlyFee] = useState('');
  const [convertGender, setConvertGender] = useState<string>('');

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
    const reason = closeReasonType === 'OTHER' ? closeCustomReason : closeReasonType;
    if (!reason) {
      setCloseError('Please select a reason');
      return;
    }
    setClosing(true);
    setCloseError(null);
    const result = await closeEnquiry(params.id, reason, accessToken);
    setClosing(false);
    if (!result.ok) {
      setCloseError(result.error || 'Failed to close enquiry');
      return;
    }
    setCloseOpen(false);
    refetch();
  }, [params.id, closeReasonType, closeCustomReason, accessToken, refetch]);

  const handleConvert = useCallback(async () => {
    if (!convertMonthlyFee || Number(convertMonthlyFee) <= 0) {
      setConvertError('Monthly fee is required');
      return;
    }
    setConverting(true);
    setConvertError(null);
    const result = await convertEnquiry(params.id, {
      joiningDate: convertJoiningDate,
      monthlyFee: Number(convertMonthlyFee),
      gender: convertGender || undefined,
    }, accessToken);
    setConverting(false);
    if (!result.ok) {
      setConvertError(result.error || 'Failed to convert enquiry');
      return;
    }
    setConvertOpen(false);
    router.push('/enquiries');
  }, [params.id, accessToken, router, convertJoiningDate, convertMonthlyFee, convertGender]);

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
            <Button variant="outline" size="sm" onClick={() => router.push(`/enquiries/${params.id}/edit`)}>Edit</Button>
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
        onClose={() => { setCloseOpen(false); setCloseReasonType(''); setCloseCustomReason(''); setCloseError(null); }}
        onConfirm={handleClose}
        title="Close Enquiry"
        message="Select a reason for closing this enquiry."
        confirmLabel="Close Enquiry"
        loading={closing}
      >
        {closeError && <Alert variant="error" message={closeError} />}
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className={styles.reasonChips}>
            {CLOSE_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className={`${styles.reasonChip} ${closeReasonType === reason ? styles.reasonChipActive : ''}`}
                onClick={() => { setCloseReasonType(reason); if (reason !== 'OTHER') setCloseCustomReason(''); }}
              >
                {reason.replace('_', ' ')}
              </button>
            ))}
          </div>
          {closeReasonType === 'OTHER' && (
            <Input
              label="Custom reason"
              value={closeCustomReason}
              onChange={(e) => setCloseCustomReason(e.target.value)}
              placeholder="Enter reason..."
              required
            />
          )}
        </div>
      </ConfirmDialog>

      {/* Convert to Student Modal */}
      <Modal
        open={convertOpen}
        onClose={() => { setConvertOpen(false); setConvertError(null); setConvertMonthlyFee(''); setConvertGender(''); setConvertJoiningDate(new Date().toISOString().slice(0, 10)); }}
        title="Convert to Student"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setConvertOpen(false)} disabled={converting}>Cancel</Button>
            <Button variant="primary" loading={converting} onClick={handleConvert}>Convert</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {convertError && <Alert variant="error" message={convertError} />}
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
            Convert &quot;{enquiry.prospectName}&quot; to a student.
          </p>
          <DatePicker
            label="Joining Date"
            required
            value={convertJoiningDate}
            onChange={(e) => setConvertJoiningDate(e.target.value)}
          />
          <Input
            label="Monthly Fee"
            type="number"
            required
            value={convertMonthlyFee}
            onChange={(e) => setConvertMonthlyFee(e.target.value)}
            placeholder="Enter monthly fee"
            min={0}
          />
          <div>
            <label className={styles.fieldLabel}>Gender</label>
            <div className={styles.genderRadios}>
              {GENDER_OPTIONS.map((g) => (
                <label key={g} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="convert-gender"
                    value={g}
                    checked={convertGender === g}
                    onChange={() => setConvertGender(g)}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioText}>{g}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
