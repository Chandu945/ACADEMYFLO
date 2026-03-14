import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EnquirySource } from '../../../domain/enquiry/enquiry.types';
import * as enquiryApi from '../../../infra/enquiry/enquiry-api';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { isValidDate } from '../../../domain/common/date-utils';
import { Screen } from '../../components/ui/Screen';
import { useToast } from '../../context/ToastContext';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'EditEnquiry'>;
type Route = RouteProp<MoreStackParamList, 'EditEnquiry'>;

const SOURCES: { value: EnquirySource; label: string }[] = [
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTHER', label: 'Other' },
];

export function EditEnquiryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { showToast } = useToast();
  const { enquiry } = route.params;

  const [prospectName, setProspectName] = useState(enquiry.prospectName);
  const [guardianName, setGuardianName] = useState(enquiry.guardianName ?? '');
  const [mobileNumber, setMobileNumber] = useState(enquiry.mobileNumber);
  const [whatsappNumber, setWhatsappNumber] = useState(enquiry.whatsappNumber ?? '');
  const [email, setEmail] = useState(enquiry.email ?? '');
  const [address, setAddress] = useState(enquiry.address ?? '');
  const [interestedIn, setInterestedIn] = useState(enquiry.interestedIn ?? '');
  const [source, setSource] = useState<EnquirySource | undefined>(
    enquiry.source ? (enquiry.source as EnquirySource) : undefined,
  );
  const [notes, setNotes] = useState(enquiry.notes ?? '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(enquiry.nextFollowUpDate ?? '');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    prospectName !== enquiry.prospectName ||
    guardianName !== (enquiry.guardianName ?? '') ||
    mobileNumber !== enquiry.mobileNumber ||
    whatsappNumber !== (enquiry.whatsappNumber ?? '') ||
    email !== (enquiry.email ?? '') ||
    address !== (enquiry.address ?? '') ||
    interestedIn !== (enquiry.interestedIn ?? '') ||
    (source ?? null) !== (enquiry.source as EnquirySource | null) ||
    notes !== (enquiry.notes ?? '') ||
    nextFollowUpDate !== (enquiry.nextFollowUpDate ?? '');

  useUnsavedChangesWarning(hasChanges && !saving);

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
    const result = await enquiryApi.updateEnquiry(enquiry.id, {
      prospectName: prospectName.trim(),
      guardianName: guardianName.trim() || null,
      mobileNumber: mobileNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      interestedIn: interestedIn.trim() || null,
      source: source ?? null,
      notes: notes.trim() || null,
      nextFollowUpDate: nextFollowUpDate.trim() || null,
    });
    setSaving(false);

    if (result.ok) {
      showToast('Enquiry updated');
      navigation.goBack();
    } else {
      Alert.alert('Error', result.error.message);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Prospect Information */}
        <Text style={styles.sectionTitle}>Prospect Information</Text>

        <Text style={styles.label}>Prospect Name *</Text>
        <TextInput
          style={styles.input}
          value={prospectName}
          onChangeText={setProspectName}
          placeholder="Full name"
          maxLength={100}
          testID="edit-prospect-name"
        />

        <Text style={styles.label}>Guardian Name</Text>
        <TextInput
          style={styles.input}
          value={guardianName}
          onChangeText={setGuardianName}
          placeholder="Parent/Guardian name"
          maxLength={100}
          testID="edit-guardian-name"
        />

        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput
          style={styles.input}
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="10-15 digits"
          keyboardType="phone-pad"
          maxLength={15}
          testID="edit-mobile-number"
        />

        <Text style={styles.label}>WhatsApp Number</Text>
        <TextInput
          style={styles.input}
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          placeholder="If different from mobile"
          keyboardType="phone-pad"
          maxLength={15}
          testID="edit-whatsapp-number"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={100}
          testID="edit-email"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Address"
          maxLength={300}
          testID="edit-address"
        />

        {/* Enquiry Details */}
        <Text style={styles.sectionTitle}>Enquiry Details</Text>

        <Text style={styles.label}>Interested In</Text>
        <TextInput
          style={styles.input}
          value={interestedIn}
          onChangeText={setInterestedIn}
          placeholder="e.g. Cricket Coaching - Morning Batch"
          maxLength={200}
          testID="edit-interested-in"
        />

        <Text style={styles.label}>Source</Text>
        <View style={styles.sourceRow}>
          {SOURCES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.sourceChip, source === s.value && styles.sourceChipActive]}
              onPress={() => setSource(source === s.value ? undefined : s.value)}
              testID={`edit-source-${s.value}`}
            >
              <Text style={[styles.sourceChipText, source === s.value && styles.sourceChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes about the enquiry"
          multiline
          numberOfLines={3}
          maxLength={500}
          testID="edit-notes"
        />

        {/* Follow-up */}
        <Text style={styles.sectionTitle}>Follow-Up</Text>

        <DatePickerInput
          label="Next Follow-Up Date"
          value={nextFollowUpDate}
          onChange={setNextFollowUpDate}
          placeholder="Select follow-up date"
          testID="edit-next-followup-date"
        />

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, (saving || !hasChanges) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
          testID="save-enquiry-edit"
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sourceChip: {
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.base,
    alignItems: 'center',
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
