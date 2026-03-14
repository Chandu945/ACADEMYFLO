import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EnquirySource } from '../../../domain/enquiry/enquiry.types';
import * as enquiryApi from '../../../infra/enquiry/enquiry-api';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/TextArea';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { isValidDate } from '../../../domain/common/date-utils';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'AddEnquiry'>;

const SOURCES: { value: EnquirySource; label: string; icon: string }[] = [
  { value: 'WALK_IN', label: 'Walk-in', icon: 'walk' },
  { value: 'PHONE', label: 'Phone', icon: 'phone-outline' },
  { value: 'REFERRAL', label: 'Referral', icon: 'account-arrow-right-outline' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media', icon: 'share-variant-outline' },
  { value: 'WEBSITE', label: 'Website', icon: 'web' },
  { value: 'OTHER', label: 'Other', icon: 'dots-horizontal' },
];

export function AddEnquiryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const [prospectName, setProspectName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [source, setSource] = useState<EnquirySource | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  const isDirty = !!(prospectName || mobileNumber);
  useUnsavedChangesWarning(isDirty && !saving);

  const handleSave = async () => {
    if (!prospectName.trim()) {
      Alert.alert('Validation', 'Prospect name is required');
      return;
    }
    if (!mobileNumber.trim() || !/^\d{10,15}$/.test(mobileNumber.trim())) {
      Alert.alert('Validation', 'Valid mobile number (10-15 digits) is required');
      return;
    }
    if (nextFollowUpDate.trim() && !isValidDate(nextFollowUpDate.trim())) {
      Alert.alert('Validation', 'Follow-up date must be a valid date (YYYY-MM-DD)');
      return;
    }

    setSaving(true);
    const result = await enquiryApi.createEnquiry({
      prospectName: prospectName.trim(),
      guardianName: guardianName.trim() || undefined,
      mobileNumber: mobileNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      interestedIn: interestedIn.trim() || undefined,
      source,
      notes: notes.trim() || undefined,
      nextFollowUpDate: nextFollowUpDate.trim() || undefined,
    });
    setSaving(false);

    if (result.ok) {
      const data = result.value as { warning?: string; id: string };
      if (data.warning) {
        Alert.alert('Note', data.warning);
      }
      navigation.goBack();
    } else {
      Alert.alert('Error', result.error.message);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Prospect Information ──────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="account-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Prospect Information</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="Prospect Name *"
          value={prospectName}
          onChangeText={setProspectName}
          placeholder="Full name"
          maxLength={100}
          testID="prospect-name"
        />
        <Input
          label="Guardian Name"
          value={guardianName}
          onChangeText={setGuardianName}
          placeholder="Parent/Guardian name"
          maxLength={100}
          testID="guardian-name"
        />
        <Input
          label="Mobile Number *"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="10-15 digits"
          keyboardType="phone-pad"
          maxLength={15}
          testID="mobile-number"
        />
        <Input
          label="WhatsApp Number"
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          placeholder="If different from mobile"
          keyboardType="phone-pad"
          maxLength={15}
          testID="whatsapp-number"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={100}
          testID="email"
        />
        <Input
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Address"
          maxLength={300}
          testID="address"
        />
      </View>

      {/* ── Enquiry Details ───────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="clipboard-text-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Enquiry Details</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="Interested In"
          value={interestedIn}
          onChangeText={setInterestedIn}
          placeholder="e.g. Cricket Coaching - Morning Batch"
          maxLength={200}
          testID="interested-in"
        />

        <Text style={styles.chipLabel}>SOURCE</Text>
        <View style={styles.sourceRow}>
          {SOURCES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.sourceChip, source === s.value && styles.sourceChipActive]}
              onPress={() => setSource(source === s.value ? undefined : s.value)}
              testID={`source-${s.value}`}
            >
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon
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
          placeholder="Initial notes about the enquiry"
          testID="notes"
        />
      </View>

      {/* ── Follow-Up ─────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="calendar-clock" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Follow-Up</Text>
      </View>
      <View style={styles.card}>
        <DatePickerInput
          label="Next Follow-Up Date"
          value={nextFollowUpDate}
          onChange={setNextFollowUpDate}
          placeholder="Select follow-up date"
          testID="next-followup-date"
        />
      </View>

      {/* ── Save Button ───────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        testID="save-enquiry"
      >
        {!saving && (
          // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
          <Icon name="content-save-outline" size={20} color={colors.white} />
        )}
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Enquiry'}
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
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
