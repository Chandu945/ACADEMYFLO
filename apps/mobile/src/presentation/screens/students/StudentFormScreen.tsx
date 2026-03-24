import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable, Keyboard } from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StudentsStackParamList } from '../../navigation/StudentsStack';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { useToast } from '../../context/ToastContext';
import { BatchMultiSelect } from '../../components/batches/BatchMultiSelect';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import {
  validateStudentForm,
  saveStudentUseCase,
} from '../../../application/student/use-cases/save-student.usecase';
import { createStudent, updateStudent, deleteStudent, getStudentPhotoUploadPath } from '../../../infra/student/student-api';
import { getStudentBatches, setStudentBatches } from '../../../infra/batch/batch-api';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import type { Gender, CreateStudentRequest } from '../../../domain/student/student.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type FormRoute = RouteProp<StudentsStackParamList, 'StudentForm'>;

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
];

const saveApi = { createStudent, updateStudent };

/** Normalize to E.164 format (+91XXXXXXXXXX) for mobileNumber & guardian.mobile */
function normalizeToE164(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (raw.startsWith('+')) return raw;
  if (/^\d{12}$/.test(digits) && digits.startsWith('91')) return `+${digits}`;
  return raw;
}

/** Normalize to digits-only format (91XXXXXXXXXX) for whatsappNumber */
function normalizeToDigits(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (/^\d{10}$/.test(digits)) return `91${digits}`;
  return digits;
}

export function StudentFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation();
  const route = useRoute<FormRoute>();
  const { mode, student } = route.params;
  const { user, subscription } = useAuth();
  const isStaff = user?.role === 'STAFF';

  // --- Form state ---
  const [fullName, setFullName] = useState(student?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(student?.dateOfBirth ?? '');
  const [gender, setGender] = useState<Gender | ''>(student?.gender ?? '');
  const [guardianName, setGuardianName] = useState(student?.guardian?.name ?? '');
  const [guardianMobile, setGuardianMobile] = useState(student?.guardian?.mobile ?? '');
  const [guardianEmail, setGuardianEmail] = useState(student?.email ?? student?.guardian?.email ?? '');
  const [joiningDate, setJoiningDate] = useState(student?.joiningDate ?? '');
  const [monthlyFee, setMonthlyFee] = useState(
    student?.monthlyFee ? String(student.monthlyFee) : '',
  );
  const [fatherName, setFatherName] = useState(student?.fatherName ?? '');
  const [motherName, setMotherName] = useState(student?.motherName ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(student?.whatsappNumber ?? '');
  const [mobileNumber, setMobileNumber] = useState(student?.mobileNumber ?? '');
  const [addressText, setAddressText] = useState(
    student?.addressText ??
      (student?.address
        ? [student.address.line1, student.address.line2, student.address.city, student.address.state, student.address.pincode]
            .filter(Boolean)
            .join(', ')
        : ''),
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(student?.profilePhotoUrl ?? null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [today] = useState(() => new Date());
  const submittingGuardRef = useRef(false);

  // --- Refs for focus chain ---
  const fatherNameRef = useRef<TextInput>(null);
  const motherNameRef = useRef<TextInput>(null);
  const whatsappRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const guardianNameRef = useRef<TextInput>(null);
  const guardianMobileRef = useRef<TextInput>(null);
  const monthlyFeeRef = useRef<TextInput>(null);

  // Ref-based form snapshot for handleSubmit: with 15+ fields, using state directly
  // would require a massive dependency array and cause unnecessary callback recreation.
  // The ref is synced on every render (below), so handleSubmit always reads current values.
  const formRef = useRef({
    fullName, dateOfBirth, gender, guardianName, guardianMobile, guardianEmail,
    joiningDate, monthlyFee, fatherName, motherName, whatsappNumber, mobileNumber,
    addressText, photoUrl, selectedBatchIds,
  });
  // Keep refs in sync
  formRef.current = {
    fullName, dateOfBirth, gender, guardianName, guardianMobile, guardianEmail,
    joiningDate, monthlyFee, fatherName, motherName, whatsappNumber, mobileNumber,
    addressText, photoUrl, selectedBatchIds,
  };

  // --- Dirty tracking ---
  const initialRef = useRef({
    fullName, dateOfBirth, gender, guardianName, guardianMobile, guardianEmail,
    joiningDate, monthlyFee, fatherName, motherName, whatsappNumber, mobileNumber,
    addressText, photoUrl, selectedBatchIds: [] as string[],
  });
  const isDirty = useMemo(() => {
    const init = initialRef.current;
    return fullName !== init.fullName ||
      dateOfBirth !== init.dateOfBirth ||
      gender !== init.gender ||
      guardianName !== init.guardianName ||
      guardianMobile !== init.guardianMobile ||
      guardianEmail !== init.guardianEmail ||
      joiningDate !== init.joiningDate ||
      monthlyFee !== init.monthlyFee ||
      fatherName !== init.fatherName ||
      motherName !== init.motherName ||
      whatsappNumber !== init.whatsappNumber ||
      mobileNumber !== init.mobileNumber ||
      addressText !== init.addressText ||
      photoUrl !== init.photoUrl ||
      JSON.stringify(selectedBatchIds) !== JSON.stringify(init.selectedBatchIds);
  }, [fullName, dateOfBirth, gender, guardianName, guardianMobile, guardianEmail,
    joiningDate, monthlyFee, fatherName, motherName, whatsappNumber, mobileNumber,
    addressText, photoUrl, selectedBatchIds]);
  useUnsavedChangesWarning(isDirty && !submitting);

  // --- Load batches for edit mode ---
  useEffect(() => {
    if (mode === 'edit' && student?.id) {
      let cancelled = false;
      getStudentBatches(student.id).then((result) => {
        if (!cancelled && result.ok) {
          const ids = result.value.map((b) => b.id);
          setSelectedBatchIds(ids);
          initialRef.current.selectedBatchIds = ids;
        }
      }).catch(() => {});
      return () => { cancelled = true; };
    }
  }, [mode, student?.id]);

  // --- Field change helpers ---
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (serverError) setServerError(null);
  }, [serverError]);

  const makeChangeHandler = useCallback(
    (setter: (v: string) => void, field?: string) =>
      (text: string) => {
        setter(text);
        if (field) clearFieldError(field);
      },
    [clearFieldError],
  );

  const handleFullNameChange = useMemo(() => makeChangeHandler(setFullName, 'fullName'), [makeChangeHandler]);
  const handleFatherNameChange = useMemo(() => makeChangeHandler(setFatherName), [makeChangeHandler]);
  const handleMotherNameChange = useMemo(() => makeChangeHandler(setMotherName), [makeChangeHandler]);
  const handleWhatsappChange = useMemo(() => makeChangeHandler(setWhatsappNumber), [makeChangeHandler]);
  const handleMobileChange = useMemo(() => makeChangeHandler(setMobileNumber), [makeChangeHandler]);
  const handleEmailChange = useMemo(() => makeChangeHandler(setGuardianEmail, 'guardianEmail'), [makeChangeHandler]);
  const handleAddressChange = useMemo(() => makeChangeHandler(setAddressText), [makeChangeHandler]);
  const handleGuardianNameChange = useMemo(() => makeChangeHandler(setGuardianName), [makeChangeHandler]);
  const handleGuardianMobileChange = useMemo(() => makeChangeHandler(setGuardianMobile, 'guardianMobile'), [makeChangeHandler]);
  const handleMonthlyFeeChange = useMemo(() => makeChangeHandler(setMonthlyFee, 'monthlyFee'), [makeChangeHandler]);

  const handleGenderChange = useCallback((value: Gender) => {
    setGender(value);
    clearFieldError('gender');
  }, [clearFieldError]);

  const handleDobChange = useCallback((value: string) => {
    setDateOfBirth(value);
    clearFieldError('dateOfBirth');
  }, [clearFieldError]);

  const handleJoiningDateChange = useCallback((value: string) => {
    setJoiningDate(value);
    clearFieldError('joiningDate');
  }, [clearFieldError]);

  // --- Delete ---
  const canDelete = mode === 'edit' && user?.role === 'OWNER' && student?.id;

  const handleDelete = useCallback(async () => {
    if (!student?.id || submittingGuardRef.current) return;
    submittingGuardRef.current = true;
    setSubmitting(true);
    try {
      const result = await deleteStudent(student.id);
      if (result.ok) {
        setShowDeleteConfirm(false);
        showToast('Student deleted');
        navigation.goBack();
      } else {
        setServerError(result.error.message);
      }
    } catch {
      if (__DEV__) console.error('[StudentFormScreen] Delete failed');
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      submittingGuardRef.current = false;
    }
  }, [student?.id, navigation, showToast]);

  // --- Submit ---
  const showMonthlyFee = mode === 'create' || !isStaff;

  const handleSubmit = useCallback(async () => {
    if (submittingGuardRef.current) return;
    Keyboard.dismiss();
    const f = formRef.current;

    const fields: Record<string, string> = {
      fullName: f.fullName,
      dateOfBirth: f.dateOfBirth,
      gender: f.gender,
      addressLine1: f.addressText.trim().slice(0, 100) || '',
      city: '',
      state: '',
      pincode: '',
      guardianName: f.guardianName,
      guardianMobile: f.guardianMobile ? normalizeToE164(f.guardianMobile.trim()) : '',
      guardianEmail: f.guardianEmail,
      joiningDate: f.joiningDate,
      monthlyFee: f.monthlyFee,
    };

    const errors = validateStudentForm(fields, mode);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const data: CreateStudentRequest = {
      fullName: f.fullName.trim(),
      dateOfBirth: f.dateOfBirth,
      gender: f.gender as Gender,
      // TODO: API should accept addressText directly instead of structured address.
      // These placeholder values are sent because the API requires structured fields
      // but the form only collects free-text address.
      address: {
        line1: f.addressText.trim().slice(0, 100) || '-',
        city: '-',
        state: '-',
        pincode: '000000',
      },
      joiningDate: f.joiningDate,
      monthlyFee: Number(f.monthlyFee),
    };

    // Guardian — only include fields that have values; omit empty strings
    const guardianNameVal = f.guardianName.trim();
    const guardianMobileVal = f.guardianMobile.trim() ? normalizeToE164(f.guardianMobile.trim()) : '';
    const guardianEmailVal = f.guardianEmail.trim();
    if (guardianNameVal || guardianMobileVal || guardianEmailVal) {
      const guardian: Record<string, string> = {};
      if (guardianNameVal) guardian.name = guardianNameVal;
      if (guardianMobileVal) guardian.mobile = guardianMobileVal;
      if (guardianEmailVal) guardian.email = guardianEmailVal;
      data.guardian = guardian as any;
    }

    if (guardianEmailVal) {
      data.email = guardianEmailVal;
    }
    if (f.fatherName.trim()) data.fatherName = f.fatherName.trim();
    if (f.motherName.trim()) data.motherName = f.motherName.trim();
    if (f.whatsappNumber.trim()) data.whatsappNumber = normalizeToDigits(f.whatsappNumber.trim());
    if (f.mobileNumber.trim()) data.mobileNumber = normalizeToE164(f.mobileNumber.trim());
    if (f.addressText.trim()) data.addressText = f.addressText.trim();
    if (f.photoUrl) data.profilePhotoUrl = f.photoUrl;

    // Staff cannot change fees
    if (mode === 'edit' && isStaff) {
      delete (data as Partial<CreateStudentRequest>).monthlyFee;
    }

    submittingGuardRef.current = true;
    setSubmitting(true);
    setServerError(null);

    try {
      const result = await saveStudentUseCase({ saveApi }, mode, student?.id, data);

      if (result.ok) {
        const studentId = mode === 'edit' ? student?.id : (result.value as { id?: string })?.id;
        if (studentId) {
          try {
            const batchResult = await setStudentBatches(studentId, f.selectedBatchIds);
            if (batchResult && !batchResult.ok) {
              showToast('Student saved but batch assignment failed.', 'error');
            }
          } catch {
            showToast('Student saved but batch assignment failed.', 'error');
          }
        }

        showToast(mode === 'create' ? 'Student created' : 'Student updated');

        if (mode === 'create' && subscription) {
          const currentTier = subscription.tiers.find(
            (t) => t.tierKey === subscription.currentTierKey,
          );
          if (currentTier?.max && subscription.activeStudentCount + 1 > currentTier.max) {
            crossAlert(
              'Tier Upgrade Required',
              `Your active student count now exceeds the limit for your current tier (${currentTier.max} students). Please upgrade your subscription to continue adding students.`,
              [{ text: 'OK' }],
            );
          }
        }

        navigation.goBack();
      } else {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        setServerError(result.error.message);
      }
    } catch {
      if (__DEV__) console.error('[StudentFormScreen] Submit failed');
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      submittingGuardRef.current = false;
    }
  }, [mode, student?.id, isStaff, subscription, navigation, showToast]);

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
        uploadPath={mode === 'edit' && student?.id ? getStudentPhotoUploadPath(student.id) : undefined}
        onPhotoUploaded={setPhotoUrl}
        size={90}
        testID="student-form-photo"
      />

      {/* Section: Student Information */}
      <Text style={styles.sectionTitle} accessibilityRole="header">Student Information</Text>
      <Text style={styles.sectionSubtitle}>Enter student personal details here.</Text>

      <Input
        label="Student Name"
        value={fullName}
        onChangeText={handleFullNameChange}
        error={fieldErrors['fullName']}
        maxLength={100}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => fatherNameRef.current?.focus()}
        testID="input-fullName"
      />

      <Input
        ref={fatherNameRef}
        label="Father Name"
        value={fatherName}
        onChangeText={handleFatherNameChange}
        maxLength={100}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => motherNameRef.current?.focus()}
        testID="input-fatherName"
      />

      <Input
        ref={motherNameRef}
        label="Mother Name"
        value={motherName}
        onChangeText={handleMotherNameChange}
        maxLength={100}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => Keyboard.dismiss()}
        testID="input-motherName"
      />

      <DatePickerInput
        label="Date of Birth"
        value={dateOfBirth}
        onChange={handleDobChange}
        error={fieldErrors['dateOfBirth']}
        maximumDate={today}
        placeholder="Select date of birth"
        testID="input-dateOfBirth"
      />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.genderOption, gender === opt.value && styles.genderSelected]}
            onPress={() => handleGenderChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: gender === opt.value }}
            accessibilityLabel={`Gender: ${opt.label}`}
            testID={`gender-${opt.value.toLowerCase()}`}
          >
            <Text style={[styles.genderLabel, gender === opt.value && styles.genderLabelSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {fieldErrors['gender'] ? (
        <Text style={styles.fieldError}>{fieldErrors['gender']}</Text>
      ) : null}

      {/* Section: Contact Information */}
      <Text style={styles.sectionTitle} accessibilityRole="header">Contact Information</Text>
      <Text style={styles.sectionSubtitle}>Phone numbers with country code.</Text>

      <Input
        ref={whatsappRef}
        label="WhatsApp"
        value={whatsappNumber}
        onChangeText={handleWhatsappChange}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        prefix="+91"
        placeholder="9876543210"
        maxLength={15}
        returnKeyType="next"
        onSubmitEditing={() => mobileRef.current?.focus()}
        testID="input-whatsappNumber"
      />

      <Input
        ref={mobileRef}
        label="Mobile Number"
        value={mobileNumber}
        onChangeText={handleMobileChange}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        prefix="+91"
        placeholder="9876543210"
        maxLength={15}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        testID="input-mobileNumber"
      />

      <Input
        ref={emailRef}
        label="Email"
        value={guardianEmail}
        onChangeText={handleEmailChange}
        error={fieldErrors['guardianEmail']}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={100}
        returnKeyType="next"
        onSubmitEditing={() => addressRef.current?.focus()}
        testID="input-guardianEmail"
      />

      <Input
        ref={addressRef}
        label="Address"
        value={addressText}
        onChangeText={handleAddressChange}
        placeholder="456 Park Lane, Mumbai"
        maxLength={300}
        returnKeyType="next"
        onSubmitEditing={() => guardianNameRef.current?.focus()}
        testID="input-addressText"
      />

      {/* Section: Guardian Information (Optional) */}
      <Text style={styles.sectionTitle} accessibilityRole="header">Guardian Information</Text>
      <Text style={styles.sectionSubtitle}>Optional — add parent/guardian contact details.</Text>

      <Input
        ref={guardianNameRef}
        label="Guardian Name (Optional)"
        value={guardianName}
        onChangeText={handleGuardianNameChange}
        maxLength={100}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => guardianMobileRef.current?.focus()}
        testID="input-guardianName"
      />

      <Input
        ref={guardianMobileRef}
        label="Guardian Mobile (Optional)"
        value={guardianMobile}
        onChangeText={handleGuardianMobileChange}
        error={fieldErrors['guardianMobile']}
        prefix="+91"
        placeholder="9876543210"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={16}
        returnKeyType="next"
        onSubmitEditing={() => monthlyFeeRef.current?.focus()}
        testID="input-guardianMobile"
      />

      {/* Section: Enrollment */}
      <Text style={styles.sectionTitle} accessibilityRole="header">Enrollment</Text>

      <DatePickerInput
        label="Joining Date"
        value={joiningDate}
        onChange={handleJoiningDateChange}
        error={fieldErrors['joiningDate']}
        placeholder="Select joining date"
        testID="input-joiningDate"
      />

      {showMonthlyFee && (
        <Input
          ref={monthlyFeeRef}
          label="Monthly Fee"
          value={monthlyFee}
          onChangeText={handleMonthlyFeeChange}
          error={fieldErrors['monthlyFee']}
          keyboardType="numeric"
          maxLength={8}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          testID="input-monthlyFee"
        />
      )}

      <BatchMultiSelect selectedIds={selectedBatchIds} onChange={setSelectedBatchIds} />

      <View style={styles.submitContainer}>
        <Button
          title={submitting ? (mode === 'create' ? 'Saving...' : 'Saving changes...') : (mode === 'create' ? 'Save' : 'Save Changes')}
          onPress={handleSubmit}
          loading={submitting}
          testID="submit-button"
        />
        {canDelete && (
          <View style={styles.deleteContainer}>
            <Button
              title="Delete Student"
              variant="danger"
              onPress={() => setShowDeleteConfirm(true)}
              loading={submitting}
              testID="delete-button"
            />
          </View>
        )}
      </View>
      <ConfirmSheet
        visible={showDeleteConfirm}
        title="Delete Student"
        message={serverError && showDeleteConfirm ? serverError : "Are you sure you want to delete this student? This cannot be undone."}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setServerError(null);
        }}
        loading={submitting}
        testID="delete-confirm"
      />
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
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMedium,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  genderOption: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  genderSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
  },
  genderLabelSelected: {
    color: colors.white,
  },
  fieldError: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginTop: -12,
    marginBottom: spacing.base,
  },
  submitContainer: {
    marginTop: spacing.sm,
  },
  deleteContainer: {
    marginTop: spacing.md,
  },
});
