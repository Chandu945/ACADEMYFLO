import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StaffStackParamList } from '../../navigation/StaffStack';
import { Input } from '../../components/ui/Input';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import {
  validateCreateStaffForm,
  validateUpdateStaffForm,
  createStaffUseCase,
} from '../../../application/staff/use-cases/create-staff.usecase';
import { updateStaffUseCase } from '../../../application/staff/use-cases/update-staff.usecase';
import { createStaff, updateStaff, getStaffPhotoUploadPath } from '../../../infra/staff/staff-api';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import type { CreateStaffInput, UpdateStaffInput } from '../../../domain/staff/staff.types';
import type { SalaryFrequency } from '../../../domain/staff/staff.types';
import { AppIcon } from '../../components/ui/AppIcon';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

type FormRoute = RouteProp<StaffStackParamList, 'StaffForm'>;

function normalizeToE164(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (raw.startsWith('+')) return raw;
  if (/^\d{12}$/.test(digits) && digits.startsWith('91')) return `+${digits}`;
  return raw;
}

/** Strip country code prefix to get bare 10-digit number for display */
function stripCountryCode(phone: string): string {
  if (!phone) return '';
  const stripped = phone.replace(/^\+91/, '').replace(/^\+/, '');
  // If it starts with 91 and is 12 digits, strip the 91
  if (/^91\d{10}$/.test(stripped)) return stripped.slice(2);
  return stripped;
}

const GENDER_OPTIONS: { label: string; value: 'MALE' | 'FEMALE' | 'OTHER' }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
];

const SALARY_FREQ_OPTIONS: { label: string; value: SalaryFrequency }[] = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Daily', value: 'DAILY' },
];

const createApi = { createStaff };
const updateApi = { updateStaff };

export function StaffFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation();
  const route = useRoute<FormRoute>();
  const { mode, staff } = route.params;

  // Basic fields
  const [fullName, setFullName] = useState(staff?.fullName ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(stripCountryCode(staff?.phoneNumber ?? ''));
  const [password, setPassword] = useState('');

  // Extended fields
  const [startDate, setStartDate] = useState(staff?.startDate ?? '');
  const [gender, setGender] = useState(staff?.gender ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(stripCountryCode(staff?.whatsappNumber ?? ''));
  // mobileNumber is derived from the staff prop; there's intentionally no UI
  // input for it on this form. Using a ref/constant rather than an unused
  // useState setter (ESLint flagged the dead `_setMobileNumber`).
  const mobileNumber = stripCountryCode(staff?.mobileNumber ?? '');
  const [address, setAddress] = useState(staff?.address ?? '');
  const [qualification, setQualification] = useState(staff?.qualificationInfo?.qualification ?? '');
  const [position, setPosition] = useState(staff?.qualificationInfo?.position ?? '');
  const [salaryAmount, setSalaryAmount] = useState(
    staff?.salaryConfig?.amount != null ? String(staff.salaryConfig.amount) : '',
  );
  const [salaryFrequency, setSalaryFrequency] = useState<string>(
    staff?.salaryConfig?.frequency ?? 'MONTHLY',
  );

  const [photoUrl, setPhotoUrl] = useState<string | null>(staff?.profilePhotoUrl ?? null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const initialRef = useRef({
    fullName, email, phoneNumber, startDate, gender,
    whatsappNumber, mobileNumber, address, qualification, position,
    salaryAmount, salaryFrequency, password, photoUrl,
  });
  const isDirty = fullName !== initialRef.current.fullName ||
    email !== initialRef.current.email ||
    phoneNumber !== initialRef.current.phoneNumber ||
    startDate !== initialRef.current.startDate ||
    gender !== initialRef.current.gender ||
    whatsappNumber !== initialRef.current.whatsappNumber ||
    mobileNumber !== initialRef.current.mobileNumber ||
    address !== initialRef.current.address ||
    qualification !== initialRef.current.qualification ||
    position !== initialRef.current.position ||
    salaryAmount !== initialRef.current.salaryAmount ||
    salaryFrequency !== initialRef.current.salaryFrequency ||
    password !== initialRef.current.password ||
    photoUrl !== initialRef.current.photoUrl;
  useUnsavedChangesWarning(isDirty && !submitting && !submittedRef.current);

  const handleSubmit = useCallback(async () => {
    const fields = { fullName, email, phoneNumber, password };
    const errors =
      mode === 'create' ? validateCreateStaffForm(fields) : validateUpdateStaffForm(fields);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setServerError(null);
    setSubmitting(true);

    try {
    let result;
    if (mode === 'create') {
      const input: CreateStaffInput = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: normalizeToE164(phoneNumber.trim()),
        password,
      };
      if (startDate.trim()) input.startDate = startDate.trim();
      if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER') input.gender = gender;
      if (whatsappNumber.trim()) input.whatsappNumber = normalizeToE164(whatsappNumber.trim());
      if (mobileNumber.trim()) input.mobileNumber = normalizeToE164(mobileNumber.trim());
      if (address.trim()) input.address = address.trim();
      if (qualification.trim() || position.trim()) {
        input.qualificationInfo = {
          qualification: qualification.trim() || null,
          position: position.trim() || null,
        };
      }
      if (salaryAmount.trim()) {
        input.salaryConfig = {
          amount: Number(salaryAmount.trim()),
          frequency: salaryFrequency as SalaryFrequency,
        };
      }
      if (photoUrl) input.profilePhotoUrl = photoUrl;
      result = await createStaffUseCase({ staffApi: createApi }, input);
    } else {
      const patch: UpdateStaffInput = {};
      if (fullName.trim() !== staff?.fullName) patch.fullName = fullName.trim();
      if (email.trim().toLowerCase() !== staff?.email) patch.email = email.trim().toLowerCase();
      if (normalizeToE164(phoneNumber.trim()) !== staff?.phoneNumber) patch.phoneNumber = normalizeToE164(phoneNumber.trim());
      if (password) patch.password = password;

      // Extended fields — send if changed
      const newStartDate = startDate.trim() || null;
      if (newStartDate !== (staff?.startDate ?? null)) patch.startDate = newStartDate;

      const newGender = gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER' ? gender : null;
      if (newGender !== (staff?.gender ?? null)) patch.gender = newGender;

      const newWhatsapp = whatsappNumber.trim() ? normalizeToE164(whatsappNumber.trim()) : null;
      if (newWhatsapp !== (staff?.whatsappNumber ?? null)) patch.whatsappNumber = newWhatsapp;

      const newMobile = mobileNumber.trim() ? normalizeToE164(mobileNumber.trim()) : null;
      if (newMobile !== (staff?.mobileNumber ?? null)) patch.mobileNumber = newMobile;

      const newAddress = address.trim() || null;
      if (newAddress !== (staff?.address ?? null)) patch.address = newAddress;

      const newQual = qualification.trim() || null;
      const newPos = position.trim() || null;
      const oldQual = staff?.qualificationInfo?.qualification ?? null;
      const oldPos = staff?.qualificationInfo?.position ?? null;
      if (newQual !== oldQual || newPos !== oldPos) {
        patch.qualificationInfo =
          newQual || newPos ? { qualification: newQual, position: newPos } : null;
      }

      const newAmount = salaryAmount.trim() ? Number(salaryAmount.trim()) : null;
      const oldAmount = staff?.salaryConfig?.amount ?? null;
      const oldFreq = staff?.salaryConfig?.frequency ?? 'MONTHLY';
      if (newAmount !== oldAmount || salaryFrequency !== oldFreq) {
        patch.salaryConfig = newAmount != null
          ? { amount: newAmount, frequency: salaryFrequency as SalaryFrequency }
          : null;
      }

      // Photo: unlike students (where UpdateStudentDto rejects profilePhotoUrl),
      // UpdateStaffDto accepts it — so include changes in the PATCH body or the
      // user's photo edit silently disappears.
      const newPhotoUrl = photoUrl || null;
      if (newPhotoUrl !== (staff?.profilePhotoUrl ?? null)) patch.profilePhotoUrl = newPhotoUrl;

      result = await updateStaffUseCase({ staffApi: updateApi }, staff!.id, patch);
    }

    if (result.ok) {
      submittedRef.current = true;
      showToast(mode === 'create' ? 'Staff created' : 'Staff updated');
      (navigation as any).navigate('StaffList');
      return;
    }

    const msg = result.error.message;
    if (result.error.fieldErrors && Object.keys(result.error.fieldErrors).length > 0) {
      setFieldErrors(result.error.fieldErrors);
    } else if (/email already exists/i.test(msg)) {
      setFieldErrors({ email: msg });
    } else if (/phone.*already exists/i.test(msg)) {
      setFieldErrors({ phoneNumber: msg });
    } else {
      setServerError(msg);
    }
    } catch (e) {
      if (__DEV__) console.error('[StaffFormScreen] Submit failed:', e);
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    fullName, email, phoneNumber, password, startDate, gender,
    whatsappNumber, mobileNumber, address, qualification, position,
    salaryAmount, salaryFrequency, mode, staff, navigation, showToast,
  ]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {serverError && <InlineError message={serverError} />}

      {/* Profile Photo */}
      <ProfilePhotoUploader
        currentPhotoUrl={photoUrl}
        uploadPath={mode === 'edit' && staff?.id ? getStaffPhotoUploadPath(staff.id) : undefined}
        onPhotoUploaded={setPhotoUrl}
        size={96}
        shape="rounded"
        testID="staff-form-photo"
      />

      {/* Basic Information */}
      <View style={styles.sectionHeader}>
        
        <AppIcon name="account-outline" size={18} color={colors.text} />
        <Text style={styles.sectionTitle} accessibilityRole="header">Basic Information</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Full Name"
          value={fullName}
          onChangeText={(text) => setFullName(text.replace(/[^a-zA-Z\s'.,-]/g, ''))}
          placeholder="e.g. Priya Sharma"
          error={fieldErrors['fullName']}
          autoCapitalize="words"
          maxLength={100}
          testID="input-fullName"
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. priya@example.com"
          error={fieldErrors['email']}
          keyboardType="email-address"
          maxLength={100}
          testID="input-email"
        />

        <Input
          label="Phone Number"
          value={phoneNumber}
          onChangeText={(text) => {
            let digits = text.replace(/[^0-9]/g, '');
            if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
            if (digits.length > 0 && !/^[6-9]/.test(digits)) return;
            setPhoneNumber(digits.slice(0, 10));
          }}
          prefix="+91"
          placeholder="9876543210"
          error={fieldErrors['phoneNumber']}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={10}
          testID="input-phoneNumber"
        />

        <Input
          label={mode === 'create' ? 'Password' : 'New Password (optional)'}
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'create' ? 'Min 8 characters' : 'Leave blank to keep current'}
          error={fieldErrors['password']}
          secureTextEntry
          maxLength={64}
          testID="input-password"
        />
      </View>

      {/* Personal Details */}
      <View style={styles.sectionHeader}>
        
        <AppIcon name="card-account-details-outline" size={18} color={colors.text} />
        <Text style={styles.sectionTitle} accessibilityRole="header">Personal Details</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.pickerLabel}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, gender === opt.value && styles.chipActive]}
              onPress={() => setGender(gender === opt.value ? '' : opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: gender === opt.value }}
              accessibilityLabel={`Gender: ${opt.label}`}
              testID={`gender-${opt.value.toLowerCase()}`}
            >
              {gender === opt.value ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.chipText, gender === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <DatePickerInput
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
          placeholder="Select start date"
          testID="input-startDate"
        />
      </View>

      {/* Contact Information */}
      <View style={styles.sectionHeader}>
        
        <AppIcon name="phone-outline" size={18} color={colors.text} />
        <Text style={styles.sectionTitle} accessibilityRole="header">Contact Information</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Full address"
          maxLength={300}
          testID="input-address"
        />
      </View>

      {/* Qualification & Position */}
      <View style={styles.sectionHeader}>
        
        <AppIcon name="school-outline" size={18} color={colors.text} />
        <Text style={styles.sectionTitle} accessibilityRole="header">Qualification & Position</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Qualification"
          value={qualification}
          onChangeText={setQualification}
          placeholder="e.g. B.Ed, M.A."
          maxLength={100}
          testID="input-qualification"
        />

        <Input
          label="Position"
          value={position}
          onChangeText={setPosition}
          placeholder="e.g. Head Coach, Assistant"
          maxLength={100}
          testID="input-position"
        />
      </View>

      {/* Salary Configuration */}
      <View style={styles.sectionHeader}>
        
        <AppIcon name="currency-inr" size={18} color={colors.text} />
        <Text style={styles.sectionTitle} accessibilityRole="header">Salary Configuration</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Salary Amount"
          value={salaryAmount}
          onChangeText={setSalaryAmount}
          placeholder="e.g. 25000"
          keyboardType="numeric"
          maxLength={10}
          testID="input-salaryAmount"
        />

        <Text style={styles.pickerLabel}>Salary Frequency</Text>
        <View style={styles.chipRow}>
          {SALARY_FREQ_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, salaryFrequency === opt.value && styles.chipActive]}
              onPress={() => setSalaryFrequency(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: salaryFrequency === opt.value }}
              accessibilityLabel={`Salary frequency: ${opt.label}`}
              testID={`freq-${opt.value.toLowerCase()}`}
            >
              {salaryFrequency === opt.value ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.chipText, salaryFrequency === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.submitContainer}>
        <Button
          title={mode === 'create' ? 'Create Staff' : 'Update Staff'}
          onPress={handleSubmit}
          loading={submitting}
          testID="submit-button"
        />
      </View>
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
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pickerLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    overflow: 'hidden',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  submitContainer: {
    marginTop: spacing.lg,
  },
});
