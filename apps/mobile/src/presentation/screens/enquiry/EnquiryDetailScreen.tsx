import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,

  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EnquiryDetail, ClosureReason } from '../../../domain/enquiry/enquiry.types';
import * as enquiryApi from '../../../infra/enquiry/enquiry-api';
import { getTodayIST } from '../../../domain/common/date-utils';
import { enquiryDetailSchema } from '../../../domain/enquiry/enquiry.schemas';
import { useAuth } from '../../context/AuthContext';
import type { AppError } from '../../../domain/common/errors';

// Map common server error codes to actionable messages so the user sees
// "Check your connection" instead of a raw transport error string.
function friendlyEnquiryError(error: AppError, action: 'follow-up' | 'close' | 'convert'): { title: string; message: string } {
  switch (error.code) {
    case 'FORBIDDEN':
      return { title: 'Not allowed', message: `You do not have permission to ${action} this enquiry.` };
    case 'NOT_FOUND':
      return { title: 'Not found', message: 'This enquiry no longer exists. Please refresh.' };
    case 'CONFLICT':
      return { title: 'Conflict', message: error.message || 'This enquiry was modified by someone else. Please reload.' };
    case 'VALIDATION':
      return { title: 'Invalid input', message: error.message };
    case 'NETWORK':
    case 'UNKNOWN':
      return { title: 'Network error', message: 'Could not reach the server. Check your connection and try again.' };
    default:
      return { title: 'Error', message: error.message };
  }
}
import { AppIcon } from '../../components/ui/AppIcon';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { Badge } from '../../components/ui/Badge';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'EnquiryDetail'>;
type Route = RouteProp<MoreStackParamList, 'EnquiryDetail'>;

/** Safely format a date string (handles ISO datetime, YYYY-MM-DD, or any parseable format) */
function safeFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    let d: Date;
    if (dateStr.includes('T')) {
      // Full ISO datetime — parse directly to preserve timezone info
      d = new Date(dateStr);
    } else {
      // Date-only string (YYYY-MM-DD) — anchor at IST midnight so the calendar
      // day doesn't shift on non-IST devices
      d = new Date(dateStr + 'T00:00:00+05:30');
    }
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return dateStr;
  }
}

export function EnquiryDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const enquiryId = route.params?.enquiryId ?? '';

  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const mountedRef = useRef(true);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await enquiryApi.getEnquiryDetail(enquiryId);
      if (!mountedRef.current) return;
      if (result.ok) {
        const parsed = enquiryDetailSchema.safeParse(result.value);
        if (parsed.success) {
          setEnquiry(parsed.data as EnquiryDetail);
        } else {
          setError('Invalid data received from server.');
          if (__DEV__) console.error('[EnquiryDetailScreen] Zod parse failed:', parsed.error);
        }
      } else {
        setError(result.error.message || 'Failed to load enquiry details.');
      }
    } catch (err) {
      if (__DEV__) console.error('[EnquiryDetailScreen] loadDetail failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [enquiryId]);

  useEffect(() => {
    mountedRef.current = true;
    loadDetail();
    return () => { mountedRef.current = false; };
  }, [loadDetail]);

  // Refresh when returning from EditEnquiry
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadDetail();
    }, [loadDetail]),
  );

  const isOverdue = (() => {
    if (!enquiry?.nextFollowUpDate) return false;
    return enquiry.nextFollowUpDate < getTodayIST();
  })();

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <InlineError message={error} onRetry={loadDetail} />
        </View>
      </View>
    );
  }

  if (!enquiry) {
    return (
      <View style={styles.screen}>
        <EmptyState
          message="Enquiry not found"
          subtitle="This enquiry may have been removed."
          icon="file-document-outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <InitialsAvatar name={enquiry.prospectName} size={52} style={styles.headerAvatarSpacing} />
          <View style={styles.headerInfo}>
            <Text style={styles.prospectName} numberOfLines={1}>{enquiry.prospectName}</Text>
            {enquiry.mobileNumber && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>{enquiry.mobileNumber}</Text>
            )}
          </View>
          <Badge
            label={enquiry.status}
            variant={enquiry.status === 'ACTIVE' ? 'success' : 'neutral'}
            dot
            uppercase
          />
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            
            <AppIcon name="phone-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>
          <InfoRow label="Mobile" value={enquiry.mobileNumber} />
          {enquiry.whatsappNumber && <InfoRow label="WhatsApp" value={enquiry.whatsappNumber} />}
          {enquiry.email && <InfoRow label="Email" value={enquiry.email} />}
          {enquiry.guardianName && <InfoRow label="Guardian" value={enquiry.guardianName} />}
          {enquiry.address && <InfoRow label="Address" value={enquiry.address} />}
        </View>

        {/* Enquiry Info */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            
            <AppIcon name="information-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          {enquiry.interestedIn && <InfoRow label="Interested In" value={enquiry.interestedIn} />}
          {enquiry.source && <InfoRow label="Source" value={enquiry.source.replace(/_/g, ' ')} />}
          {enquiry.nextFollowUpDate && (
            <InfoRow
              label="Next Follow-Up"
              value={`${safeFormatDate(enquiry.nextFollowUpDate)}${isOverdue ? ' (OVERDUE)' : ''}`}
              valueStyle={isOverdue ? styles.overdueValue : undefined}
            />
          )}
        </View>

        {/* Notes */}
        {enquiry.notes && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              
              <AppIcon name="note-text-outline" size={18} color={colors.text} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{enquiry.notes}</Text>
          </View>
        )}

        {/* Closure Info */}
        {enquiry.closureReason && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              
              <AppIcon name="close-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.sectionTitle}>Closure</Text>
            </View>
            <InfoRow label="Reason" value={enquiry.closureReason.replace(/_/g, ' ')} />
          </View>
        )}

        {/* Follow-Up History */}
        <View style={styles.section}>
          <View style={styles.followUpHeader}>
            <View style={styles.sectionTitleRow}>
              
              <AppIcon name="history" size={18} color={colors.text} />
              <Text style={styles.sectionTitle}>Follow-Up History ({enquiry.followUps.length})</Text>
            </View>
            {enquiry.status === 'ACTIVE' && (
              <TouchableOpacity onPress={() => setShowFollowUpModal(true)} style={styles.addFollowUpBtn} testID="add-followup-btn">
                
                <AppIcon name="plus" size={16} color={colors.textSecondary} />
                <Text style={styles.addFollowUpLink}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {enquiry.followUps.length === 0 ? (
            <Text style={styles.emptyFollowUp}>No follow-ups recorded yet</Text>
          ) : (
            [...enquiry.followUps].reverse().map((f) => (
              <View key={f.id} style={styles.followUpCard}>
                <View style={styles.followUpDateRow}>
                  
                  <AppIcon name="calendar" size={14} color={colors.textSecondary} />
                  <Text style={styles.followUpDate}>
                    {safeFormatDate(f.date)}
                  </Text>
                </View>
                <Text style={styles.followUpNotes}>{f.notes}</Text>
                {f.nextFollowUpDate && (
                  <Text style={styles.followUpNext}>
                    Next: {safeFormatDate(f.nextFollowUpDate)}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Actions */}
        {enquiry.status === 'ACTIVE' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditEnquiry', { enquiry })}
              testID="edit-enquiry-btn"
            >
              
              <AppIcon name="pencil-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.editButtonText}>Edit Enquiry</Text>
            </TouchableOpacity>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.followUpButton}
                onPress={() => setShowFollowUpModal(true)}
                testID="add-followup-action"
              >
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <AppIcon name="phone-forward-outline" size={18} color={colors.white} />
                <Text style={styles.followUpButtonText}>Follow-Up</Text>
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowCloseModal(true)}
                  testID="close-enquiry-btn"
                >
                  
                  <AppIcon name="close-circle-outline" size={18} color={colors.danger} />
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              )}


            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Follow-Up Modal */}
      <AddFollowUpModal
        visible={showFollowUpModal}
        enquiryId={enquiryId}
        onClose={() => setShowFollowUpModal(false)}
        onSaved={() => { setShowFollowUpModal(false); loadDetail(); }}
      />

      {/* Close Enquiry Modal */}
      <CloseEnquiryModal
        visible={showCloseModal}
        enquiryId={enquiryId}
        onClose={() => setShowCloseModal(false)}
        onClosed={() => { setShowCloseModal(false); loadDetail(); }}
      />

    </View>
  );
}

function InfoRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: object }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function AddFollowUpModal({
  visible, enquiryId, onClose, onSaved,
}: { visible: boolean; enquiryId: string; onClose: () => void; onSaved: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDate(getTodayIST());
      setNotes('');
      setNextDate('');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!notes.trim()) {
      crossAlert('Validation', 'Notes are required');
      return;
    }
    setSaving(true);
    try {
      const result = await enquiryApi.addFollowUp(enquiryId, {
        date,
        notes: notes.trim(),
        nextFollowUpDate: nextDate || undefined,
      });
      if (result.ok) {
        setDate(''); setNotes(''); setNextDate('');
        onSaved();
      } else {
        const m = friendlyEnquiryError(result.error, 'follow-up');
        crossAlert(m.title, m.message);
      }
    } catch (err) {
      if (__DEV__) console.error('[EnquiryDetailScreen] handleSave failed:', err);
      crossAlert('Error', 'Failed to save follow-up. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const content = (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Add Follow-Up</Text>

        <Text style={styles.label}>Notes *</Text>
        <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} placeholder="What was discussed?" multiline testID="followup-notes" />

        <Text style={styles.label}>Schedule Next Follow-Up</Text>
        <DatePickerInput value={nextDate} onChange={setNextDate} placeholder="Select next follow-up date" testID="followup-next-date" />

        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} testID="followup-cancel">
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving} testID="followup-save">
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') return content;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

function CloseEnquiryModal({
  visible, enquiryId, onClose, onClosed,
}: { visible: boolean; enquiryId: string; onClose: () => void; onClosed: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [reason, setReason] = useState<ClosureReason | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
    }
  }, [visible]);

  const reasons: { value: ClosureReason; label: string }[] = [
    { value: 'CONVERTED', label: 'Converted to Student' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
    { value: 'OTHER', label: 'Other' },
  ];

  const handleClose = async () => {
    if (!reason) {
      crossAlert('Validation', 'Please select a closure reason');
      return;
    }
    setSaving(true);
    try {
      const result = await enquiryApi.closeEnquiry(enquiryId, { closureReason: reason });
      if (result.ok) {
        setReason('');
        onClosed();
      } else {
        const m = friendlyEnquiryError(result.error, 'close');
        crossAlert(m.title, m.message);
      }
    } catch (err) {
      if (__DEV__) console.error('[EnquiryDetailScreen] handleClose failed:', err);
      crossAlert('Error', 'Failed to close enquiry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const content = (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Close Enquiry</Text>
        <Text style={styles.label}>Reason</Text>
        <View style={styles.reasonRow}>
          {reasons.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.reasonChip, reason === r.value && styles.reasonChipActive]}
              onPress={() => setReason(r.value)}
              testID={`reason-${r.value}`}
            >
              {reason === r.value ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.reasonChipText, reason === r.value && styles.reasonChipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} testID="close-cancel">
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dangerBtn, saving && styles.saveBtnDisabled]}
            onPress={handleClose}
            disabled={saving}
            testID="close-confirm"
          >
            <Text style={styles.saveBtnText}>{saving ? 'Closing...' : 'Close Enquiry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') return content;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

function _ConvertToStudentModal({
  visible, enquiryId, onClose, onConverted,
}: { visible: boolean; enquiryId: string; onClose: () => void; onConverted: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [joiningDate, setJoiningDate] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [saving, setSaving] = useState(false);

  const genders: { value: 'MALE' | 'FEMALE' | 'OTHER'; label: string }[] = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
  ];

  const handleConvert = async () => {
    if (!joiningDate || !monthlyFee || !dateOfBirth || !gender || !addressLine1 || !city || !state || !pincode) {
      crossAlert('Validation', 'All fields are required');
      return;
    }
    const fee = parseFloat(monthlyFee);
    if (isNaN(fee) || fee <= 0) {
      crossAlert('Validation', 'Monthly fee must be a positive number');
      return;
    }

    setSaving(true);
    try {
      const result = await enquiryApi.convertToStudent(enquiryId, {
        joiningDate,
        monthlyFee: fee,
        dateOfBirth,
        gender,
        addressLine1,
        city,
        state,
        pincode,
      });

      if (result.ok) {
        crossAlert('Success', 'Enquiry converted to student successfully');
        setJoiningDate(''); setMonthlyFee(''); setDateOfBirth(''); setGender('');
        setAddressLine1(''); setCity(''); setState(''); setPincode('');
        onConverted();
      } else {
        const m = friendlyEnquiryError(result.error, 'convert');
        crossAlert(m.title, m.message);
      }
    } catch (err) {
      if (__DEV__) console.error('[EnquiryDetailScreen] handleConvert failed:', err);
      crossAlert('Error', 'Failed to convert enquiry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.convertModalScroll}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Convert to Student</Text>

            <Text style={styles.label}>Joining Date *</Text>
            <DatePickerInput value={joiningDate} onChange={setJoiningDate} placeholder="Select joining date" testID="convert-joining-date" />

            <Text style={styles.label}>Monthly Fee *</Text>
            <TextInput style={styles.input} value={monthlyFee} onChangeText={setMonthlyFee} placeholder="1500" keyboardType="numeric" testID="convert-monthly-fee" />

            <Text style={styles.label}>Date of Birth *</Text>
            <DatePickerInput value={dateOfBirth} onChange={setDateOfBirth} placeholder="Select date of birth" maximumDate={new Date()} testID="convert-dob" />

            <Text style={styles.label}>Gender *</Text>
            <View style={styles.reasonRow}>
              {genders.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.reasonChip, gender === g.value && styles.reasonChipActive]}
                  onPress={() => setGender(g.value)}
                  testID={`convert-gender-${g.value}`}
                >
                  {gender === g.value ? (
                    <LinearGradient
                      colors={[gradient.start, gradient.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <Text style={[styles.reasonChipText, gender === g.value && styles.reasonChipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Address Line 1 *</Text>
            <TextInput style={styles.input} value={addressLine1} onChangeText={setAddressLine1} placeholder="Street address" testID="convert-address" />

            <Text style={styles.label}>City *</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" testID="convert-city" />

            <Text style={styles.label}>State *</Text>
            <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="State" testID="convert-state" />

            <Text style={styles.label}>Pincode *</Text>
            <TextInput style={styles.input} value={pincode} onChangeText={setPincode} placeholder="560001" keyboardType="numeric" testID="convert-pincode" />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} testID="convert-cancel">
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleConvert}
                disabled={saving}
                testID="convert-confirm"
              >
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.saveBtnText}>{saving ? 'Converting...' : 'Convert'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* ── Header ─────────────────────────────────────── */
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.md },
  headerAvatarSpacing: {
    // avatar provides own sizing; extra spacing handled by headerRow gap.
  },
  headerInfo: { flex: 1, minWidth: 0 },
  prospectName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* ── Sections ───────────────────────────────────── */
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.base, marginBottom: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  infoLabel: { fontSize: fontSizes.base, color: colors.textSecondary },
  infoValue: { fontSize: fontSizes.base, color: colors.text, fontWeight: fontWeights.medium, flex: 1, textAlign: 'right' },
  overdueValue: { color: colors.danger },
  notesText: { fontSize: fontSizes.base, color: colors.textLight, lineHeight: 22 },

  /* ── Follow-Up History ──────────────────────────── */
  followUpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  addFollowUpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgSubtle, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  addFollowUpLink: { fontSize: fontSizes.sm, color: colors.text, fontWeight: fontWeights.semibold },
  emptyFollowUp: { fontSize: fontSizes.base, color: colors.textSecondary, fontStyle: 'italic' },
  followUpCard: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followUpDateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  followUpDate: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text },
  followUpNotes: { fontSize: fontSizes.base, color: colors.textLight, marginTop: spacing.xs, lineHeight: 20 },
  followUpNext: { fontSize: fontSizes.sm, color: colors.text, marginTop: spacing.sm, fontWeight: fontWeights.medium },

  /* ── Actions ────────────────────────────────────── */
  actionsContainer: { marginTop: spacing.sm },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  editButtonText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  followUpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  followUpButtonText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.white },
  closeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  closeButtonText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.danger },
  convertButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  convertButtonText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.success },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 } : {}),
  },
  modalContent: { backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.xl },
  modalTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.base },
  label: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, fontSize: fontSizes.base, color: colors.text },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.base, alignItems: 'center' },
  cancelButtonText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.textSecondary },
  saveBtn: { flex: 1, overflow: 'hidden', borderRadius: radius.xl, padding: spacing.base, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.white },
  dangerBtn: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.xl, padding: spacing.base, alignItems: 'center' },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reasonChipActive: { overflow: 'hidden', borderColor: colors.primary },
  reasonChipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  reasonChipTextActive: { color: colors.white },
  convertModalScroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
});
