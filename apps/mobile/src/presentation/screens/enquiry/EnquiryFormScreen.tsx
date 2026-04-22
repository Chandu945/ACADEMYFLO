import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useNavigation } from '@react-navigation/native';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EnquirySource, EnquiryDetail } from '../../../domain/enquiry/enquiry.types';
import * as enquiryApi from '../../../infra/enquiry/enquiry-api';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/TextArea';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { isValidDate, toDateOnly } from '../../../domain/common/date-utils';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

function stripCountryCode(phone: string): string {
  if (!phone) return '';
  const stripped = phone.replace(/^\+91/, '').replace(/^\+/, '');
  if (/^91\d{10}$/.test(stripped)) return stripped.slice(2);
  return stripped;
}

type Nav = NativeStackNavigationProp<MoreStackParamList>;

export const SOURCES: { value: EnquirySource; label: string; icon: string }[] = [
  { value: 'WALK_IN', label: 'Walk-in', icon: 'walk' },
  { value: 'PHONE', label: 'Phone', icon: 'phone-outline' },
  { value: 'REFERRAL', label: 'Referral', icon: 'account-arrow-right-outline' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media', icon: 'share-variant-outline' },
  { value: 'WEBSITE', label: 'Website', icon: 'web' },
  { value: 'OTHER', label: 'Other', icon: 'dots-horizontal' },
];

export type EnquiryFormProps = {
  mode: 'create' | 'edit';
  enquiry?: EnquiryDetail;
};

export function EnquiryFormScreen({ mode, enquiry }: EnquiryFormProps) {
  const isEdit = mode === 'edit';
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();

  const [prospectName, setProspectName] = useState(enquiry?.prospectName ?? '');
  const [guardianName, _setGuardianName] = useState(enquiry?.guardianName ?? '');
  const [mobileNumber, setMobileNumber] = useState(stripCountryCode(enquiry?.mobileNumber ?? ''));
  const [whatsappNumber, _setWhatsappNumber] = useState(stripCountryCode(enquiry?.whatsappNumber ?? ''));
  const [email, _setEmail] = useState(enquiry?.email ?? '');
  const [address, _setAddress] = useState(enquiry?.address ?? '');
  const [interestedIn, setInterestedIn] = useState(enquiry?.interestedIn ?? '');
  const [source, setSource] = useState<EnquirySource | undefined>(
    enquiry?.source ? (enquiry.source as EnquirySource) : undefined,
  );
  const [notes, setNotes] = useState(enquiry?.notes ?? '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(toDateOnly(enquiry?.nextFollowUpDate));
  const [saving, setSaving] = useState(false);
  const submittedRef = useRef(false);

  // In edit mode, track whether any field changed from its initial value.
  // In create mode, consider the form dirty if the two required fields have content.
  const hasChanges = isEdit
    ? prospectName !== (enquiry?.prospectName ?? '') ||
      guardianName !== (enquiry?.guardianName ?? '') ||
      mobileNumber !== (enquiry?.mobileNumber ?? '') ||
      whatsappNumber !== (enquiry?.whatsappNumber ?? '') ||
      email !== (enquiry?.email ?? '') ||
      address !== (enquiry?.address ?? '') ||
      interestedIn !== (enquiry?.interestedIn ?? '') ||
      (source ?? null) !== ((enquiry?.source as EnquirySource | null) ?? null) ||
      notes !== (enquiry?.notes ?? '') ||
      nextFollowUpDate !== toDateOnly(enquiry?.nextFollowUpDate)
    : !!(prospectName || mobileNumber);

  useUnsavedChangesWarning(hasChanges && !saving && !submittedRef.current);

  const testIdPrefix = isEdit ? 'edit-' : '';

  const handleSave = async () => {
    const trimmedName = prospectName.trim();
    if (!trimmedName) {
      crossAlert('Validation', 'Prospect name is required');
      return;
    }
    if (trimmedName.length < 2) {
      crossAlert('Validation', 'Name must be at least 2 characters');
      return;
    }
    if (!/^[a-zA-Z\s'.,-]+$/.test(trimmedName)) {
      crossAlert('Validation', 'Name can only contain letters, spaces, and punctuation');
      return;
    }
    if (!mobileNumber.trim() || !/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
      crossAlert('Validation', 'Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }
    if (nextFollowUpDate.trim() && !isValidDate(nextFollowUpDate.trim())) {
      crossAlert('Validation', 'Follow-up date must be a valid date (YYYY-MM-DD)');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && enquiry) {
        const result = await enquiryApi.updateEnquiry(enquiry.id, {
          prospectName: prospectName.trim(),
          guardianName: guardianName.trim() || null,
          mobileNumber: (() => { const cleaned = mobileNumber.trim().replace(/^(\+)?91/, '').replace(/^0/, ''); return /^\d{10}$/.test(cleaned) ? `91${cleaned}` : cleaned; })(),
          whatsappNumber: (() => { if (!whatsappNumber.trim()) return null; const cleaned = whatsappNumber.trim().replace(/^(\+)?91/, '').replace(/^0/, ''); return /^\d{10}$/.test(cleaned) ? `91${cleaned}` : cleaned; })(),
          email: email.trim() || null,
          address: address.trim() || null,
          interestedIn: interestedIn.trim() || null,
          source: source ?? null,
          notes: notes.trim() || null,
          nextFollowUpDate: nextFollowUpDate.trim() || null,
        });

        if (result.ok) {
          submittedRef.current = true;
          showToast('Enquiry updated');
          (navigation as any).replace('EnquiryDetail', { enquiryId: enquiry!.id });
          return;
        } else {
          crossAlert('Error', result.error.message);
        }
      } else {
        const result = await enquiryApi.createEnquiry({
          prospectName: prospectName.trim(),
          guardianName: guardianName.trim() || undefined,
          mobileNumber: (() => { const cleaned = mobileNumber.trim().replace(/^(\+)?91/, '').replace(/^0/, ''); return /^\d{10}$/.test(cleaned) ? `91${cleaned}` : cleaned; })(),
          whatsappNumber: (() => { if (!whatsappNumber.trim()) return undefined; const cleaned = whatsappNumber.trim().replace(/^(\+)?91/, '').replace(/^0/, ''); return /^\d{10}$/.test(cleaned) ? `91${cleaned}` : cleaned; })(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          interestedIn: interestedIn.trim() || undefined,
          source,
          notes: notes.trim() || undefined,
          nextFollowUpDate: nextFollowUpDate.trim() || undefined,
        });

        if (result.ok) {
          submittedRef.current = true;
          const data = result.value as { warning?: string; id: string };
          if (data.warning) {
            crossAlert('Note', data.warning);
          }
          showToast('Enquiry created successfully');
          (navigation as any).navigate('EnquiryList');
          return;
        } else {
          crossAlert('Error', result.error.message);
        }
      }
    } catch (e) {
      if (__DEV__) console.error(`[EnquiryForm:${mode}] Save failed:`, e);
      crossAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = isEdit ? saving || !hasChanges : saving;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Prospect Information ──────────────────────── */}
      <View style={styles.sectionHeader}>

        <AppIcon name="account-outline" size={20} color={colors.text} />
        <Text style={styles.sectionTitle}>Prospect Information</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="Prospect Name *"
          value={prospectName}
          onChangeText={(text) => setProspectName(text.replace(/[^a-zA-Z\s'.,-]/g, ''))}
          placeholder="Full name"
          maxLength={100}
          autoCapitalize="words"
          testID={`${testIdPrefix}prospect-name`}
        />
        <Input
          label="Mobile Number *"
          value={mobileNumber}
          onChangeText={(text) => {
            let digits = text.replace(/[^0-9]/g, '');
            if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
            if (digits.length > 0 && !/^[6-9]/.test(digits)) return;
            setMobileNumber(digits.slice(0, 10));
          }}
          prefix="+91"
          placeholder="9876543210"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={10}
          testID={`${testIdPrefix}mobile-number`}
        />
      </View>

      {/* ── Enquiry Details ───────────────────────────── */}
      <View style={styles.sectionHeader}>

        <AppIcon name="clipboard-text-outline" size={20} color={colors.text} />
        <Text style={styles.sectionTitle}>Enquiry Details</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="Interested In"
          value={interestedIn}
          onChangeText={setInterestedIn}
          placeholder="e.g. Cricket Coaching - Morning Batch"
          maxLength={200}
          testID={`${testIdPrefix}interested-in`}
        />

        <Text style={styles.chipLabel}>SOURCE</Text>
        <View style={styles.sourceRow}>
          {SOURCES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.sourceChip, source === s.value && styles.sourceChipActive]}
              onPress={() => setSource(source === s.value ? undefined : s.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: source === s.value }}
              accessibilityLabel={s.label}
              testID={`${testIdPrefix}source-${s.value}`}
            >
              {source === s.value ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <AppIcon
                name={s.icon}
                size={14}
                color={source === s.value ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.sourceChipText, source === s.value && styles.sourceChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextArea
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder={isEdit ? 'Notes about the enquiry' : 'Initial notes about the enquiry'}
          testID={`${testIdPrefix}notes`}
        />
      </View>

      {/* ── Follow-Up ─────────────────────────────────── */}
      <View style={styles.sectionHeader}>

        <AppIcon name="calendar-clock" size={20} color={colors.text} />
        <Text style={styles.sectionTitle}>Follow-Up</Text>
      </View>
      <View style={styles.card}>
        <DatePickerInput
          label="Next Follow-Up Date"
          value={nextFollowUpDate}
          onChange={setNextFollowUpDate}
          placeholder="Select follow-up date"
          testID={`${testIdPrefix}next-followup-date`}
        />
      </View>

      {/* ── Save Button ───────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaveDisabled}
        testID={isEdit ? 'save-enquiry-edit' : 'save-enquiry'}
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {!saving && (

          <AppIcon name="content-save-outline" size={20} color={colors.white} />
        )}
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Enquiry'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },

  /* ── Section Header ─────────────────────────────── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },

  /* ── Card ────────────────────────────────────────── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },

  /* ── Source Chips ────────────────────────────────── */
  chipLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sourceChipActive: {
    overflow: 'hidden',
    borderColor: colors.primary,
  },
  sourceChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  sourceChipTextActive: {
    color: colors.white,
  },

  /* ── Save Button ────────────────────────────────── */
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
});
