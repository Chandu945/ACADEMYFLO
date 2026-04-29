import React, { useState, useCallback, useMemo, useRef } from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, Keyboard } from 'react-native';
import type { TextInput } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BatchesStackParamList } from '../../navigation/BatchesStack';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/TextArea';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { DaysPicker } from '../../components/batches/DaysPicker';
import { TimePickerInput } from '../../components/ui/TimePickerInput';
import {
  validateBatchForm,
  saveBatchUseCase,
} from '../../../application/batch/use-cases/save-batch.usecase';
import { createBatch, updateBatch } from '../../../infra/batch/batch-api';
import { invalidateBatchCache } from '../../../infra/batch/batch-cache';
import type { Weekday, CreateBatchRequest } from '../../../domain/batch/batch.types';
import { spacing, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

type FormRoute = RouteProp<BatchesStackParamList, 'BatchForm'>;

const saveApi = { createBatch, updateBatch };

export function BatchFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation();
  const route = useRoute<FormRoute>();
  const { mode, batch } = route.params;

  const [batchName, setBatchName] = useState(batch?.batchName ?? '');
  const [days, setDays] = useState<Weekday[]>(batch?.days ?? []);
  const [notes, setNotes] = useState(batch?.notes ?? '');
  const [startTime, setStartTime] = useState(batch?.startTime ?? '');
  const [endTime, setEndTime] = useState(batch?.endTime ?? '');
  const [maxStudents, setMaxStudents] = useState(
    batch?.maxStudents != null ? String(batch.maxStudents) : '',
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const maxStudentsRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const submittedRef = useRef(false);

  const isDirty = !!(batchName !== (batch?.batchName ?? '') ||
    notes !== (batch?.notes ?? '') ||
    startTime !== (batch?.startTime ?? '') ||
    endTime !== (batch?.endTime ?? '') ||
    maxStudents !== (batch?.maxStudents != null ? String(batch.maxStudents) : '') ||
    JSON.stringify(days) !== JSON.stringify(batch?.days ?? []));
  useUnsavedChangesWarning(isDirty && !submitting && !submittedRef.current);

  // Ref snapshot for handleSubmit — avoids massive dependency array for 6 fields.
  const formRef = useRef({ batchName, days, notes, startTime, endTime, maxStudents });
  formRef.current = { batchName, days, notes, startTime, endTime, maxStudents };

  // --- Field error clearing ---
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (serverError) setServerError(null);
  }, [serverError]);

  const handleBatchNameChange = useCallback((text: string) => {
    setBatchName(text);
    clearFieldError('batchName');
  }, [clearFieldError]);

  const handleMaxStudentsChange = useCallback((text: string) => {
    setMaxStudents(text);
    clearFieldError('maxStudents');
  }, [clearFieldError]);

  const handleDaysChange = useCallback((newDays: Weekday[]) => {
    setDays(newDays);
    clearFieldError('days');
  }, [clearFieldError]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    Keyboard.dismiss();

    const f = formRef.current;
    const fields: Record<string, string> = {
      batchName: f.batchName,
      days: f.days.join(','),
      notes: f.notes,
      startTime: f.startTime,
      endTime: f.endTime,
      maxStudents: f.maxStudents,
    };

    const errors = validateBatchForm(fields);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const data: CreateBatchRequest = {
      batchName: f.batchName.trim(),
      days: f.days.length > 0 ? f.days : undefined,
      notes: f.notes.trim() || null,
      startTime: f.startTime.trim() || null,
      endTime: f.endTime.trim() || null,
      maxStudents: f.maxStudents.trim() ? parseInt(f.maxStudents.trim(), 10) : null,
    };

    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);

    try {
      const result = await saveBatchUseCase({ saveApi }, mode, batch?.id, data);

      if (result.ok) {
        submittedRef.current = true;
        invalidateBatchCache();
        showToast(mode === 'create' ? 'Batch created' : 'Batch updated');
        if (mode === 'edit' && result.value) {
          (navigation as any).replace('BatchDetail', { batch: result.value });
        } else {
          (navigation as any).navigate('BatchesList');
        }
        return;
      } else {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        setServerError(result.error.message);
      }
    } catch {
      if (__DEV__) console.error('[BatchFormScreen] Submit failed');
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [mode, batch?.id, navigation, showToast]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {serverError && <InlineError message={serverError} />}

      <View style={styles.formCard}>
        <Input
          label="Batch Name"
          value={batchName}
          onChangeText={handleBatchNameChange}
          error={fieldErrors['batchName']}
          maxLength={50}
          returnKeyType="next"
          onSubmitEditing={() => maxStudentsRef.current?.focus()}
          testID="input-batchName"
        />

        <DaysPicker
          selected={days}
          onChange={handleDaysChange}
          error={fieldErrors['days']}
        />

        <TimePickerInput
          label="Start Time (optional)"
          value={startTime}
          onChange={setStartTime}
          error={fieldErrors['startTime']}
          placeholder="Select start time"
          testID="input-startTime"
        />

        <TimePickerInput
          label="End Time (optional)"
          value={endTime}
          onChange={setEndTime}
          error={fieldErrors['endTime']}
          placeholder="Select end time"
          testID="input-endTime"
        />

        <Input
          ref={maxStudentsRef}
          label="Max Students (optional)"
          value={maxStudents}
          onChangeText={handleMaxStudentsChange}
          error={fieldErrors['maxStudents']}
          placeholder="e.g. 30, leave empty for unlimited"
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          testID="input-maxStudents"
        />

        <TextArea
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          error={fieldErrors['notes']}
          testID="input-notes"
        />
      </View>

      <View style={styles.submitContainer}>
        <Button
          title={submitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create Batch' : 'Save Changes')}
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
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },
  submitContainer: {
    marginTop: spacing.lg,
  },
});
