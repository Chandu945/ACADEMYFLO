import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Alert } from 'react-native';
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

export function StudentFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation();
  const route = useRoute<FormRoute>();
  const { mode, student } = route.params;
  const { user, subscription } = useAuth();
  const isStaff = user?.role === 'STAFF';

  // Existing fields
  const [fullName, setFullName] = useState(student?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(student?.dateOfBirth ?? '');
  const [gender, setGender] = useState<Gender | ''>(student?.gender ?? '');
  const [addressLine1] = useState(student?.address.line1 ?? '');
  const [addressLine2] = useState(student?.address.line2 ?? '');
  const [city] = useState(student?.address.city ?? '');
  const [state] = useState(student?.address.state ?? '');
  const [pincode] = useState(student?.address.pincode ?? '');
  const [guardianName, setGuardianName] = useState(student?.guardian?.name ?? '');
  const [guardianMobile, setGuardianMobile] = useState(student?.guardian?.mobile ?? '');
  const [guardianEmail, setGuardianEmail] = useState(student?.email ?? student?.guardian?.email ?? '');
  const [joiningDate, setJoiningDate] = useState(student?.joiningDate ?? '');
  const [monthlyFee, setMonthlyFee] = useState(
    student?.monthlyFee ? String(student.monthlyFee) : '',
  );

  // New extended fields
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

  const canDelete = mode === 'edit' && user?.role === 'OWNER' && student?.id;

  const handleDelete = useCallback(async () => {
    if (!student?.id) return;
    setSubmitting(true);
    const result = await deleteStudent(student.id);
    setSubmitting(false);
    if (result.ok) {
      setShowDeleteConfirm(false);
      showToast('Student deleted');
      navigation.goBack();
    } else {
      setServerError(result.error.message);
    }
  }, [student?.id, navigation, showToast]);

  const showMonthlyFee = mode === 'create' || !isStaff;

  const handleSubmit = useCallback(async () => {
    const fields: Record<string, string> = {
      fullName,
      dateOfBirth,
      gender,
      addressLine1,
      city,
      state,
      pincode,
      guardianName,
      guardianMobile,
      guardianEmail,
      joiningDate,
      monthlyFee,
    };

    const errors = validateStudentForm(fields, mode);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const data: CreateStudentRequest = {
      fullName: fullName.trim(),
      dateOfBirth,
      gender: gender as Gender,
      address: {
        line1: addressLine1.trim() || addressText.trim().slice(0, 100) || '-',
        ...(addressLine2.trim() ? { line2: addressLine2.trim() } : {}),
        city: city.trim() || '-',
        state: state.trim() || '-',
        pincode: pincode.trim() || '000000',
      },
      joiningDate,
      monthlyFee: Number(monthlyFee),
    };

    // Guardian — always include email so parent invite flow can use it
    if (guardianName.trim() || guardianMobile.trim() || guardianEmail.trim()) {
      data.guardian = {
        name: guardianName.trim(),
        mobile: guardianMobile.trim(),
        email: guardianEmail.trim(),
      };
    }

    // Email goes to both student.email and guardian.email (used for parent invite)
    if (guardianEmail.trim()) {
      data.email = guardianEmail.trim();
      // Ensure guardian exists with at least the email, even if name/mobile are empty
      if (!data.guardian) {
        data.guardian = { name: '', mobile: '', email: guardianEmail.trim() };
      }
    }
    if (fatherName.trim()) data.fatherName = fatherName.trim();
    if (motherName.trim()) data.motherName = motherName.trim();
    if (whatsappNumber.trim()) data.whatsappNumber = whatsappNumber.trim();
    if (mobileNumber.trim()) data.mobileNumber = mobileNumber.trim();
    if (addressText.trim()) data.addressText = addressText.trim();
    if (photoUrl) data.profilePhotoUrl = photoUrl;

    // Staff cannot change fees
    if (mode === 'edit' && isStaff) {
      delete (data as Partial<CreateStudentRequest>).monthlyFee;
    }

    setSubmitting(true);
    setServerError(null);

    const result = await saveStudentUseCase({ saveApi }, mode, student?.id, data);

    setSubmitting(false);

    if (result.ok) {
      const studentId = mode === 'edit' ? student?.id : (result.value as { id?: string })?.id;
      if (studentId) {
        const batchResult = await setStudentBatches(studentId, selectedBatchIds);
        if (batchResult && !batchResult.ok) {
          showToast('Student saved but batch assignment failed. Please try again.', 'error');
        }
      }

      showToast(mode === 'create' ? 'Student created' : 'Student updated');

      if (mode === 'create' && subscription) {
        const currentTier = subscription.tiers.find(
          (t) => t.tierKey === subscription.currentTierKey,
        );
        if (currentTier?.max && subscription.activeStudentCount + 1 > currentTier.max) {
          Alert.alert(
            'Tier Upgrade Required',
            `Your active student count now exceeds the limit for your current tier (${currentTier.max} students). Please upgrade your subscription to continue adding students.`,
            [{ text: 'OK' }],
          );
        }
      }

      navigation.goBack();
    } else {
      setServerError(result.error.message);
    }
  }, [
    fullName, dateOfBirth, gender, addressLine1, addressLine2, city, state, pincode,
    guardianName, guardianMobile, guardianEmail, joiningDate, monthlyFee,
    fatherName, motherName, whatsappNumber, mobileNumber,
    addressText,
    mode, student?.id, selectedBatchIds, navigation, isStaff, subscription, showToast,
  ]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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
      <Text style={styles.sectionTitle}>Student Information</Text>
      <Text style={styles.sectionSubtitle}>Enter student personal details here.</Text>

      <Input
        label="Student Name"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors['fullName']}
        maxLength={100}
        autoCapitalize="words"
        testID="input-fullName"
      />

      <Input
        label="Father Name"
        value={fatherName}
        onChangeText={setFatherName}
        maxLength={100}
        autoCapitalize="words"
        testID="input-fatherName"
      />

      <Input
        label="Mother Name"
        value={motherName}
        onChangeText={setMotherName}
        maxLength={100}
        autoCapitalize="words"
        testID="input-motherName"
      />

      <DatePickerInput
        label="Date of Birth"
        value={dateOfBirth}
        onChange={setDateOfBirth}
        error={fieldErrors['dateOfBirth']}
        maximumDate={new Date()}
        placeholder="Select date of birth"
        testID="input-dateOfBirth"
      />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.genderOption, gender === opt.value && styles.genderSelected]}
            onPress={() => setGender(opt.value)}
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
      <Text style={styles.sectionTitle}>Contact Information</Text>
      <Text style={styles.sectionSubtitle}>Country Code Required (e.g. 91XXXXXXXXXX)</Text>

      <Input
        label="WhatsApp"
        value={whatsappNumber}
        onChangeText={setWhatsappNumber}
        keyboardType="phone-pad"
        placeholder="919876543210"
        maxLength={15}
        testID="input-whatsappNumber"
      />

      <Input
        label="Mobile Number"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        keyboardType="phone-pad"
        placeholder="919876543210"
        maxLength={15}
        testID="input-mobileNumber"
      />

      <Input
        label="Email"
        value={guardianEmail}
        onChangeText={setGuardianEmail}
        error={fieldErrors['guardianEmail']}
        keyboardType="email-address"
        maxLength={100}
        testID="input-guardianEmail"
      />

      <Input
        label="Address"
        value={addressText}
        onChangeText={setAddressText}
        placeholder="456 Park Lane, Mumbai"
        maxLength={300}
        testID="input-addressText"
      />

      {/* Section: Guardian Information (Optional) */}
      <Text style={styles.sectionTitle}>Guardian Information</Text>

      <Input
        label="Guardian Name"
        value={guardianName}
        onChangeText={setGuardianName}
        maxLength={100}
        autoCapitalize="words"
        testID="input-guardianName"
      />

      <Input
        label="Guardian Mobile (E.164)"
        value={guardianMobile}
        onChangeText={setGuardianMobile}
        error={fieldErrors['guardianMobile']}
        placeholder="+919876543210"
        keyboardType="phone-pad"
        maxLength={16}
        testID="input-guardianMobile"
      />

      {/* Section: Enrollment */}
      <Text style={styles.sectionTitle}>Enrollment</Text>

      <DatePickerInput
        label="Joining Date"
        value={joiningDate}
        onChange={setJoiningDate}
        error={fieldErrors['joiningDate']}
        placeholder="Select joining date"
        testID="input-joiningDate"
      />

      {showMonthlyFee && (
        <Input
          label="Monthly Fee"
          value={monthlyFee}
          onChangeText={setMonthlyFee}
          error={fieldErrors['monthlyFee']}
          keyboardType="numeric"
          maxLength={8}
          testID="input-monthlyFee"
        />
      )}

      <BatchMultiSelect selectedIds={selectedBatchIds} onChange={setSelectedBatchIds} />

      <View style={styles.submitContainer}>
        <Button
          title={mode === 'create' ? 'Save' : 'Save Changes'}
          onPress={handleSubmit}
          loading={submitting}
          testID="submit-button"
        />
        {canDelete && (
          <View style={styles.deleteContainer}>
            <Button
              title="Delete Student"
              variant="secondary"
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
