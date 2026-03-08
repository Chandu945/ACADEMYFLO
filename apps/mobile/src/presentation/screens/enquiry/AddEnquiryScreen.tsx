import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EnquirySource } from '../../../domain/enquiry/enquiry.types';
import * as enquiryApi from '../../../infra/enquiry/enquiry-api';
import { Screen } from '../../components/ui/Screen';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'AddEnquiry'>;

const SOURCES: { value: EnquirySource; label: string }[] = [
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTHER', label: 'Other' },
];

export function AddEnquiryScreen() {
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

  const handleSave = async () => {
    if (!prospectName.trim()) {
      Alert.alert('Validation', 'Prospect name is required');
      return;
    }
    if (!mobileNumber.trim() || !/^\d{10,15}$/.test(mobileNumber.trim())) {
      Alert.alert('Validation', 'Valid mobile number (10-15 digits) is required');
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
          testID="prospect-name"
        />

        <Text style={styles.label}>Guardian Name</Text>
        <TextInput
          style={styles.input}
          value={guardianName}
          onChangeText={setGuardianName}
          placeholder="Parent/Guardian name"
          testID="guardian-name"
        />

        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput
          style={styles.input}
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="10-15 digits"
          keyboardType="phone-pad"
          testID="mobile-number"
        />

        <Text style={styles.label}>WhatsApp Number</Text>
        <TextInput
          style={styles.input}
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          placeholder="If different from mobile"
          keyboardType="phone-pad"
          testID="whatsapp-number"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          testID="email"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Address"
          testID="address"
        />

        {/* Enquiry Details */}
        <Text style={styles.sectionTitle}>Enquiry Details</Text>

        <Text style={styles.label}>Interested In</Text>
        <TextInput
          style={styles.input}
          value={interestedIn}
          onChangeText={setInterestedIn}
          placeholder="e.g. Cricket Coaching - Morning Batch"
          testID="interested-in"
        />

        <Text style={styles.label}>Source</Text>
        <View style={styles.sourceRow}>
          {SOURCES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.sourceChip, source === s.value && styles.sourceChipActive]}
              onPress={() => setSource(source === s.value ? undefined : s.value)}
              testID={`source-${s.value}`}
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
          placeholder="Initial notes about the enquiry"
          multiline
          numberOfLines={3}
          testID="notes"
        />

        {/* Follow-up */}
        <Text style={styles.sectionTitle}>Follow-Up</Text>

        <Text style={styles.label}>Next Follow-Up Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={nextFollowUpDate}
          onChangeText={setNextFollowUpDate}
          placeholder="2026-03-10"
          testID="next-followup-date"
        />

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          testID="save-enquiry"
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Enquiry'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
