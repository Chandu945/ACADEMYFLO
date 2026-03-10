import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StaffStackParamList } from '../../navigation/StaffStack';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type FormRoute = RouteProp<StaffStackParamList, 'StaffForm'>;

const createApi = { createStaff };
const updateApi = { updateStaff };

export function StaffFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute<FormRoute>();
  const { mode, staff } = route.params;

  // Basic fields
  const [fullName, setFullName] = useState(staff?.fullName ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(staff?.phoneNumber ?? '');
  const [password, setPassword] = useState('');

  // Extended fields
  const [startDate, setStartDate] = useState(staff?.startDate ?? '');
  const [gender, setGender] = useState(staff?.gender ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(staff?.whatsappNumber ?? '');
  const [mobileNumber, setMobileNumber] = useState(staff?.mobileNumber ?? '');
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

    let result;
    if (mode === 'create') {
      const input: CreateStaffInput = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        password,
      };
      if (startDate.trim()) input.startDate = startDate.trim();
      if (gender === 'MALE' || gender === 'FEMALE') input.gender = gender;
      if (whatsappNumber.trim()) input.whatsappNumber = whatsappNumber.trim();
      if (mobileNumber.trim()) input.mobileNumber = mobileNumber.trim();
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
      if (phoneNumber.trim() !== staff?.phoneNumber) patch.phoneNumber = phoneNumber.trim();
      if (password) patch.password = password;

      // Extended fields — send if changed
      const newStartDate = startDate.trim() || null;
      if (newStartDate !== (staff?.startDate ?? null)) patch.startDate = newStartDate;

      const newGender = gender === 'MALE' || gender === 'FEMALE' ? gender : null;
      if (newGender !== (staff?.gender ?? null)) patch.gender = newGender;

      const newWhatsapp = whatsappNumber.trim() || null;
      if (newWhatsapp !== (staff?.whatsappNumber ?? null)) patch.whatsappNumber = newWhatsapp;

      const newMobile = mobileNumber.trim() || null;
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

      result = await updateStaffUseCase({ staffApi: updateApi }, staff!.id, patch);
    }

    setSubmitting(false);

    if (result.ok) {
      navigation.goBack();
    } else {
      setServerError(result.error.message);
    }
  }, [
    fullName, email, phoneNumber, password, startDate, gender,
    whatsappNumber, mobileNumber, address, qualification, position,
    salaryAmount, salaryFrequency, mode, staff, navigation,
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
        uploadPath={mode === 'edit' && staff?.id ? getStaffPhotoUploadPath(staff.id) : undefined}
        onPhotoUploaded={setPhotoUrl}
        size={90}
        testID="staff-form-photo"
      />

      {/* Basic Information */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="account-outline" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Basic Information</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Priya Sharma"
          error={fieldErrors['fullName']}
          autoCapitalize="words"
          testID="input-fullName"
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. priya@example.com"
          error={fieldErrors['email']}
          keyboardType="email-address"
          testID="input-email"
        />

        <Input
          label="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="e.g. +919876543210"
          error={fieldErrors['phoneNumber']}
          keyboardType="phone-pad"
          testID="input-phoneNumber"
        />

        <Input
          label={mode === 'create' ? 'Password' : 'New Password (optional)'}
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'create' ? 'Min 8 characters' : 'Leave blank to keep current'}
          error={fieldErrors['password']}
          secureTextEntry
          testID="input-password"
        />
      </View>

      {/* Personal Details */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="card-account-details-outline" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Personal Details</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Gender"
          value={gender}
          onChangeText={setGender}
          placeholder="MALE or FEMALE"
          testID="input-gender"
        />

        <Input
          label="Start Date"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          testID="input-startDate"
        />
      </View>

      {/* Contact Information */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="phone-outline" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Contact Information</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="WhatsApp Number"
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          placeholder="e.g. +919876543210"
          keyboardType="phone-pad"
          testID="input-whatsappNumber"
        />

        <Input
          label="Mobile Number"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="e.g. +919876543210"
          keyboardType="phone-pad"
          testID="input-mobileNumber"
        />

        <Input
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Full address"
          testID="input-address"
        />
      </View>

      {/* Qualification & Position */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="school-outline" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Qualification & Position</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Qualification"
          value={qualification}
          onChangeText={setQualification}
          placeholder="e.g. B.Ed, M.A."
          testID="input-qualification"
        />

        <Input
          label="Position"
          value={position}
          onChangeText={setPosition}
          placeholder="e.g. Head Coach, Assistant"
          testID="input-position"
        />
      </View>

      {/* Salary Configuration */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="currency-inr" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Salary Configuration</Text>
      </View>
      <View style={styles.formCard}>
        <Input
          label="Salary Amount"
          value={salaryAmount}
          onChangeText={setSalaryAmount}
          placeholder="e.g. 25000"
          keyboardType="numeric"
          testID="input-salaryAmount"
        />

        <Input
          label="Salary Frequency"
          value={salaryFrequency}
          onChangeText={setSalaryFrequency}
          placeholder="MONTHLY, WEEKLY, or DAILY"
          testID="input-salaryFrequency"
        />
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
  submitContainer: {
    marginTop: spacing.lg,
  },
});
