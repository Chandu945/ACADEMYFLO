import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TextInput } from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StudentsStackParamList } from '../../navigation/StudentsStack';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { useToast } from '../../context/ToastContext';
import { BatchMultiSelect } from '../../components/batches/BatchMultiSelect';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { popToOrReplaceList } from '../../navigation/nav-helpers';
import {
  validateStudentForm,
  saveStudentUseCase,
} from '../../../application/student/use-cases/save-student.usecase';
import { createStudent, updateStudent, getStudent, getStudentPhotoUploadPath } from '../../../infra/student/student-api';
import { ActivityIndicator } from 'react-native';
import type { StudentListItem } from '../../../domain/student/student.types';
import { getStudentBatches, setStudentBatches } from '../../../infra/batch/batch-api';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import type { Gender, CreateStudentRequest } from '../../../domain/student/student.types';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
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

/** Strip country code prefix to get bare 10-digit number for display */
function stripCountryCode(phone: string): string {
  if (!phone) return '';
  const stripped = phone.replace(/^\+91/, '').replace(/^\+/, '');
  if (/^91\d{10}$/.test(stripped)) return stripped.slice(2);
  return stripped;
}

type StudentFormBodyProps = {
  mode: 'create' | 'edit';
  student: StudentListItem | undefined;
};

/** Wrapper that resolves the route params before mounting the heavy form.
 *  Handles the web-refresh case where the URL serialized the `student`
 *  object as the literal string "[object Object]" — falls back to fetching
 *  by `studentId`. */
export function StudentFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute<FormRoute>();
  // Guard against missing/malformed route.params. React Navigation should
  // always populate params when the route was navigated to with them, but
  // on a hot-reload edge case route.params could be undefined briefly.
  const params = route.params ?? ({} as Partial<FormRoute['params']>);
  const mode: 'create' | 'edit' = params.mode === 'edit' ? 'edit' : 'create';

  // Reject the broken string-form param. On web URL refresh, an object
  // param gets toString'd to "[object Object]" — that's not a valid
  // StudentListItem. Also reject arrays (typeof array === 'object').
  const paramStudentRaw = params.student;
  const paramStudent =
    paramStudentRaw &&
    typeof paramStudentRaw === 'object' &&
    !Array.isArray(paramStudentRaw) &&
    typeof (paramStudentRaw as { id?: unknown }).id === 'string'
      ? (paramStudentRaw as StudentListItem)
      : undefined;
  const studentId = params.studentId ?? paramStudent?.id;

  const [fetched, setFetched] = useState<StudentListItem | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(
    mode === 'edit' && !paramStudent && !!studentId,
  );

  useEffect(() => {
    if (mode !== 'edit' || paramStudent || !studentId) return;
    let cancelled = false;
    setResolving(true);
    getStudent(studentId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setFetched(r.value);
          setResolveError(null);
        } else {
          setResolveError(r.error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, paramStudent, studentId]);

  const studentForForm = paramStudent ?? fetched ?? undefined;

  if (mode === 'edit' && resolving) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.resolveText}>Loading student…</Text>
      </SafeAreaView>
    );
  }

  if (mode === 'edit' && !studentForForm) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.resolveTitle}>Couldn't load this student</Text>
        <Text style={styles.resolveText}>
          {resolveError ?? 'Open the form again from the students list.'}
        </Text>
        <Pressable style={styles.resolveBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.resolveBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <StudentFormBody
      key={studentForForm?.id ?? 'create'}
      mode={mode}
      student={studentForForm}
    />
  );
}

function StudentFormBody({ mode, student }: StudentFormBodyProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation();
  const { user, subscription, refreshSubscription } = useAuth();
  const isStaff = user?.role === 'STAFF';

  // --- Form state ---
  const [fullName, setFullName] = useState(student?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(student?.dateOfBirth ?? '');
  const [gender, setGender] = useState<Gender | ''>(student?.gender ?? '');
  const [guardianName, setGuardianName] = useState(student?.guardian?.name ?? '');
  const [guardianMobile, setGuardianMobile] = useState(stripCountryCode(student?.guardian?.mobile ?? ''));
  const [guardianEmail, setGuardianEmail] = useState(student?.email ?? student?.guardian?.email ?? '');
  const [joiningDate, setJoiningDate] = useState(student?.joiningDate ?? '');
  const [monthlyFee, setMonthlyFee] = useState(
    student?.monthlyFee ? String(student.monthlyFee) : '',
  );
  const [fatherName, setFatherName] = useState(student?.fatherName ?? '');
  const [motherName, setMotherName] = useState(student?.motherName ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(stripCountryCode(student?.whatsappNumber ?? ''));
  const [mobileNumber, setMobileNumber] = useState(stripCountryCode(student?.mobileNumber ?? ''));
  const [addressText, setAddressText] = useState(
    student?.addressText ??
      (student?.address
        ? [student.address.line1, student.address.line2, student.address.city, student.address.state, student.address.pincode]
            .filter((v) => v && v !== '-' && v !== '000000')
            .join(', ')
        : ''),
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(student?.profilePhotoUrl ?? null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [today] = useState(() => new Date());
  const submittingGuardRef = useRef(false);
  const submittedRef = useRef(false);
  // BUG-020: ref to the form's ScrollView so on validation failure we can
  // jump back to the top — otherwise the first invalid field may be above
  // the fold and the Save click looks like it did nothing.
  const scrollRef = useRef<ScrollView>(null);

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
  useUnsavedChangesWarning(isDirty && !submitting && !submittedRef.current);

  // --- Load batches for edit mode ---
  useEffect(() => {
    if (mode === 'edit' && student?.id) {
      let cancelled = false;
      getStudentBatches(student.id)
        .then((result) => {
          if (cancelled) return;
          if (result.ok) {
            const ids = result.value.map((b) => b.id);
            if (__DEV__) {
              console.log('[StudentFormScreen] Loaded batches for', student.id, ids);
            }
            setSelectedBatchIds(ids);
            initialRef.current.selectedBatchIds = ids;
          } else {
            // Surface the failure so it doesn't silently look like the
            // student has no batches (which would tempt the user to "fix"
            // it by re-saving and accidentally clearing their real batches).
            if (__DEV__) {
              console.warn('[StudentFormScreen] getStudentBatches failed:', result.error);
            }
            showToast(
              `Couldn't load this student's batches: ${result.error.message}. Don't save until they reload.`,
              'error',
            );
          }
        })
        .catch((e) => {
          if (cancelled) return;
          if (__DEV__) {
            console.error('[StudentFormScreen] getStudentBatches threw:', e);
          }
          showToast(
            "Couldn't load this student's batches. Don't save until they reload.",
            'error',
          );
        });
      return () => {
        cancelled = true;
      };
    }
  }, [mode, student?.id, showToast]);

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

  const handleFullNameChange = useCallback((text: string) => {
    setFullName(text.replace(/[^a-zA-Z\s'.,-]/g, ''));
    clearFieldError('fullName');
  }, [clearFieldError]);
  const handleFatherNameChange = useCallback((text: string) => {
    setFatherName(text.replace(/[^a-zA-Z\s'.,-]/g, ''));
    clearFieldError('fatherName');
  }, [clearFieldError]);
  const handleMotherNameChange = useCallback((text: string) => {
    setMotherName(text.replace(/[^a-zA-Z\s'.,-]/g, ''));
    clearFieldError('motherName');
  }, [clearFieldError]);
  const handleWhatsappChange = useCallback((text: string) => {
    let digits = text.replace(/[^0-9]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length > 0 && !/^[6-9]/.test(digits)) return;
    setWhatsappNumber(digits.slice(0, 10));
  }, []);
  const handleMobileChange = useCallback((text: string) => {
    let digits = text.replace(/[^0-9]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length > 0 && !/^[6-9]/.test(digits)) return;
    setMobileNumber(digits.slice(0, 10));
  }, []);
  const handleEmailChange = useCallback(makeChangeHandler(setGuardianEmail, 'guardianEmail'), [makeChangeHandler]);
  const handleAddressChange = useCallback(makeChangeHandler(setAddressText), [makeChangeHandler]);
  const handleGuardianNameChange = useCallback((text: string) => {
    setGuardianName(text.replace(/[^a-zA-Z\s'.,-]/g, ''));
    clearFieldError('guardianName');
  }, [clearFieldError]);
  const handleGuardianMobileChange = useCallback((text: string) => {
    let digits = text.replace(/[^0-9]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length > 0 && !/^[6-9]/.test(digits)) return;
    setGuardianMobile(digits.slice(0, 10));
    clearFieldError('guardianMobile');
  }, [clearFieldError]);
  const handleMonthlyFeeChange = useCallback((text: string) => {
    // Digits only. `keyboardType="numeric"` is advisory on web and lets pasted
    // letters through on native too — strip here so the API never gets "efer".
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setMonthlyFee(digits);
    clearFieldError('monthlyFee');
  }, [clearFieldError]);

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

  // --- Submit ---
  const showMonthlyFee = mode === 'create' || !isStaff;

  const handleSubmit = useCallback(async () => {
    if (submittingGuardRef.current) return;
    Keyboard.dismiss();
    const f = formRef.current;

    const fields: Record<string, string> = {
      fullName: f.fullName,
      fatherName: f.fatherName,
      motherName: f.motherName,
      dateOfBirth: f.dateOfBirth,
      gender: f.gender,
      addressLine1: f.addressText.trim().slice(0, 100) || '',
      city: '',
      state: '',
      pincode: '',
      guardianName: f.guardianName,
      guardianMobile: f.guardianMobile ? normalizeToE164(f.guardianMobile.trim()) : '',
      guardianEmail: f.guardianEmail,
      mobileNumber: f.mobileNumber ? normalizeToE164(f.mobileNumber.trim()) : '',
      joiningDate: f.joiningDate,
      monthlyFee: f.monthlyFee,
    };

    const errors = validateStudentForm(fields, mode);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // BUG-020: scroll back to top so the first inline error is visible.
      // Without this, users submitting from the Save button at the bottom
      // can't see what happened.
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFieldErrors({});

    const data: CreateStudentRequest = {
      fullName: f.fullName.trim(),
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
    // BUG-022: DOB is optional. The API's strict `YYYY-MM-DD` regex
    // rejects `""`, so only include the field when the user actually
    // picked a date.
    if (f.dateOfBirth?.trim()) {
      data.dateOfBirth = f.dateOfBirth;
    }

    // Guardian — only include fields that have values; omit empty strings
    const guardianNameVal = f.guardianName.trim();
    const guardianMobileVal = f.guardianMobile.trim() ? normalizeToE164(f.guardianMobile.trim()) : '';
    const guardianEmailVal = f.guardianEmail.trim();
    if (guardianNameVal || guardianMobileVal || guardianEmailVal) {
      const guardian: Record<string, string> = {};
      if (guardianNameVal) guardian['name'] = guardianNameVal;
      if (guardianMobileVal) guardian['mobile'] = guardianMobileVal;
      if (guardianEmailVal) guardian['email'] = guardianEmailVal;
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
    // Photo URL is only accepted by CreateStudentDto. On edit, the photo is updated
    // via POST /:studentId/photo separately — sending it here trips the DTO's
    // forbidNonWhitelisted guard ("property profilePhotoUrl should not exist").
    if (mode === 'create' && f.photoUrl) data.profilePhotoUrl = f.photoUrl;

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
              // Surface the actual reason (capacity full, batch not active,
              // etc.) so the user can fix the input — generic "failed" was
              // unhelpful and made the screen feel broken.
              const reason = batchResult.error?.message ?? 'Batch assignment failed.';
              showToast(`Student saved. ${reason}`, 'error');
            }
          } catch {
            showToast('Student saved but batch assignment failed.', 'error');
          }
        }

        showToast(mode === 'create' ? 'Student created' : 'Student updated');

        // Tier-change heads-up. Fires only when THIS add moved the required
        // tier into a higher band — i.e. the 51st / 101st student. We pull a
        // fresh subscription from the server (not the cached `subscription`
        // prop, which can lag behind rapid creates and falsely re-fire the
        // alert on every subsequent add) and compare against the previous
        // requiredTierKey.
        if (mode === 'create' && subscription) {
          const previousRequiredTierKey = subscription.requiredTierKey;
          try {
            const fresh = await refreshSubscription();
            if (fresh && fresh.requiredTierKey !== previousRequiredTierKey) {
              const orderedTiers = [...fresh.tiers].sort((a, b) => a.min - b.min);
              const currentIdx = orderedTiers.findIndex(
                (t) => t.tierKey === previousRequiredTierKey,
              );
              const nextIdx = orderedTiers.findIndex(
                (t) => t.tierKey === fresh.requiredTierKey,
              );
              // Only upgrade (not downgrade) triggers the prompt.
              if (currentIdx !== -1 && nextIdx > currentIdx) {
                const nextTier = orderedTiers[nextIdx]!;
                const rangeLabel =
                  nextTier.max === null
                    ? `${nextTier.min}+ students`
                    : `${nextTier.min}–${nextTier.max} students`;
                const effectiveDate =
                  fresh.pendingTierChange?.effectiveAt ?? fresh.paidEndAt ?? null;
                const effectiveLabel = effectiveDate
                  ? new Date(effectiveDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : null;

                crossAlert(
                  'Tier will change at renewal',
                  `Your plan will move to the ${rangeLabel} tier (₹${nextTier.priceInr}/month)${
                    effectiveLabel ? ` on ${effectiveLabel}` : ''
                  }.`,
                  [{ text: 'Got it' }],
                );
              }
            }
          } catch {
            // Refresh failure shouldn't block the success flow.
          }
        }

        submittedRef.current = true;
        if (mode === 'edit' && result.value) {
          // Replace so the edit form is removed from stack — back from Detail goes to List
          (navigation as unknown as { replace: (name: string, params?: unknown) => void }).replace('StudentDetail', { student: result.value });
        } else {
          // popToOrReplaceList rather than plain navigate('StudentsList') because
          // when the user opened StudentForm via the global '+' FAB, StudentsList
          // may not be in the stack history. A plain navigate would push a fresh
          // list ON TOP of the form (form stays in the stack with its state and
          // beforeRemove never fires). popToOrReplaceList always removes the
          // form — popTo if the list is in history, else replace — so the
          // discard-changes prompt fires reliably and there's no ghost form.
          popToOrReplaceList(navigation, 'StudentsList');
        }
        return;
      } else {
        const msg = result.error.message;
        if (result.error.fieldErrors && Object.keys(result.error.fieldErrors).length > 0) {
          setFieldErrors(result.error.fieldErrors);
        } else if (/email already exists/i.test(msg)) {
          setFieldErrors({ guardianEmail: msg });
        } else if (/phone.*already exists/i.test(msg)) {
          // BUG-024: phone conflict can be on the student's own mobile or
          // the guardian's. Map the error to whichever field is populated
          // (or both) so the user actually sees the inline error. Fall
          // through to serverError only when neither field is filled.
          const studentMobileFilled = formRef.current.mobileNumber?.trim();
          const guardianMobileFilled = formRef.current.guardianMobile?.trim();
          const targetErrors: Record<string, string> = {};
          if (studentMobileFilled) targetErrors['mobileNumber'] = msg;
          if (guardianMobileFilled) targetErrors['guardianMobile'] = msg;
          if (Object.keys(targetErrors).length === 0) {
            setServerError(msg);
          } else {
            setFieldErrors(targetErrors);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }
        } else {
          setServerError(msg);
        }
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
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
      ref={scrollRef}
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
        size={96}
        shape="rounded"
        testID="student-form-photo"
      />

      {/* Section: Student Information */}
      <Text style={styles.sectionTitle} accessibilityRole="header">Student Information</Text>
      <Text style={styles.sectionSubtitle}>Enter student personal details here.</Text>

      <Input
        label="Student Name *"
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
        label="Father Name (optional)"
        value={fatherName}
        onChangeText={handleFatherNameChange}
        error={fieldErrors['fatherName']}
        maxLength={100}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => motherNameRef.current?.focus()}
        testID="input-fatherName"
      />

      <Input
        ref={motherNameRef}
        label="Mother Name (optional)"
        value={motherName}
        onChangeText={handleMotherNameChange}
        error={fieldErrors['motherName']}
        maxLength={100}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => Keyboard.dismiss()}
        testID="input-motherName"
      />

      <DatePickerInput
        label="Date of Birth *"
        value={dateOfBirth}
        onChange={handleDobChange}
        error={fieldErrors['dateOfBirth']}
        maximumDate={today}
        placeholder="Select date of birth"
        testID="input-dateOfBirth"
      />

      <Text style={styles.label}>Gender *</Text>
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
            {gender === opt.value ? (
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
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
      <Input
        ref={mobileRef}
        label="Mobile Number *"
        value={mobileNumber}
        onChangeText={handleMobileChange}
        error={fieldErrors['mobileNumber']}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        prefix="+91"
        placeholder="9876543210"
        maxLength={10}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        testID="input-mobileNumber"
      />

      <Input
        ref={emailRef}
        label="Email (Optional)"
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
        label="Address (Optional)"
        value={addressText}
        onChangeText={handleAddressChange}
        placeholder="456 Park Lane, Mumbai"
        maxLength={300}
        returnKeyType="next"
        onSubmitEditing={() => monthlyFeeRef.current?.focus()}
        testID="input-addressText"
      />

      {/* Section: Enrollment */}
      <Text style={styles.sectionTitle} accessibilityRole="header">Enrollment</Text>

      <DatePickerInput
        label="Joining Date *"
        value={joiningDate}
        onChange={handleJoiningDateChange}
        error={fieldErrors['joiningDate']}
        placeholder="Select joining date"
        testID="input-joiningDate"
      />

      {showMonthlyFee && (
        <Input
          ref={monthlyFeeRef}
          label="Monthly Fee *"
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

      <BatchMultiSelect
        selectedIds={selectedBatchIds}
        onChange={setSelectedBatchIds}
        initiallyEnrolledIds={initialRef.current.selectedBatchIds}
      />

      <View style={styles.submitContainer}>
        <Button
          title={submitting ? (mode === 'create' ? 'Saving...' : 'Saving changes...') : (mode === 'create' ? 'Save' : 'Save Changes')}
          onPress={handleSubmit}
          loading={submitting}
          testID="submit-button"
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  // Resolve-screen styles (loading + error states for the wrapper).
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  resolveTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  resolveText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resolveBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  resolveBtnText: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.sm,
  },
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
    overflow: 'hidden',
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
});
