import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import type { ExpenseCategory } from '../../../domain/expense/expense.types';
import { expenseCategoryListSchema } from '../../../domain/expense/expense.schemas';
import { saveExpenseUseCase } from '../../../application/expense/use-cases/save-expense.usecase';
import { deleteExpenseUseCase } from '../../../application/expense/use-cases/delete-expense.usecase';
import * as expenseApi from '../../../infra/expense/expense-api';
import { TextArea } from '../../components/ui/TextArea';
import { isValidDate, getTodayIST } from '../../../domain/common/date-utils';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'ExpenseForm'>;
type Route = RouteProp<MoreStackParamList, 'ExpenseForm'>;

function todayString(): string {
  return getTodayIST();
}

/** Map common expense category names to MaterialCommunityIcons */
function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('salary') || lower.includes('salaries')) return 'account-cash-outline';
  if (lower.includes('rent')) return 'home-outline';
  if (lower.includes('transport')) return 'bus';
  if (lower.includes('equipment') || lower.includes('supplies')) return 'hammer-wrench';
  if (lower.includes('utilit')) return 'lightning-bolt-outline';
  if (lower.includes('water')) return 'water-outline';
  if (lower.includes('electric')) return 'flash-outline';
  if (lower.includes('food') || lower.includes('meal')) return 'food-outline';
  if (lower.includes('repair') || lower.includes('maintenance')) return 'wrench-outline';
  if (lower.includes('marketing') || lower.includes('advertis')) return 'bullhorn-outline';
  if (lower.includes('insurance')) return 'shield-check-outline';
  if (lower.includes('internet') || lower.includes('wifi')) return 'wifi';
  if (lower.includes('phone') || lower.includes('mobile')) return 'phone-outline';
  if (lower.includes('office')) return 'office-building-outline';
  if (lower.includes('travel')) return 'airplane-outline';
  if (lower.includes('tax')) return 'file-document-outline';
  if (lower.includes('miscellan')) return 'dots-horizontal-circle-outline';
  return 'cash-outline';
}

export function ExpenseFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { mode } = route.params;
  const existing = mode === 'edit' ? route.params.expense : undefined;

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [date, setDate] = useState(existing?.date ?? todayString());
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  // Add category modal
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const mountedRef = useRef(true);

  const initialRef = useRef({ amount, date, categoryId });
  const isDirty = amount !== initialRef.current.amount ||
    date !== initialRef.current.date ||
    categoryId !== initialRef.current.categoryId;
  useUnsavedChangesWarning(isDirty && !saving);

  const loadCategories = useCallback(async () => {
    const result = await expenseApi.listCategories();
    if (!mountedRef.current) return;
    if (result.ok) {
      const parsed = expenseCategoryListSchema.safeParse(result.value);
      if (parsed.success) {
        setCategories(parsed.data.categories);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadCategories();
    return () => { mountedRef.current = false; };
  }, [loadCategories]);

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert('Validation', 'Category name is required');
      return;
    }
    setAddingCategory(true);
    const result = await expenseApi.createCategory(trimmed);
    setAddingCategory(false);
    if (result.ok) {
      setCategoryId(result.value.id);
      setNewCategoryName('');
      setShowAddCategory(false);
      loadCategories();
    } else {
      Alert.alert('Error', result.error.message);
    }
  };

  const handleSave = async () => {
    if (!categoryId) {
      Alert.alert('Validation', 'Please select a category');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!isValidDate(date)) {
      Alert.alert('Validation', 'Enter a valid date (YYYY-MM-DD)');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation', 'Amount must be greater than zero');
      return;
    }
    if (new Date(date + 'T00:00:00') > new Date()) {
      Alert.alert('Validation', 'Expense date cannot be in the future');
      return;
    }

    setSaving(true);
    const result = await saveExpenseUseCase(
      { expenseApi },
      mode === 'create'
        ? { mode: 'create', categoryId, date, amount: parsedAmount, notes: notes || undefined }
        : {
            mode: 'edit',
            id: existing!.id,
            categoryId,
            date,
            amount: parsedAmount,
            notes: notes || undefined,
          },
    );
    setSaving(false);

    if (result.ok) {
      showToast(mode === 'create' ? 'Expense added' : 'Expense updated');
      navigation.goBack();
    } else {
      Alert.alert('Error', result.error.message);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteExpenseUseCase({ expenseApi }, existing.id);
          if (result.ok) {
            showToast('Expense deleted');
            navigation.goBack();
          } else {
            Alert.alert('Error', result.error.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Category ─────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="tag-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Category</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]}
              onPress={() => setCategoryId(cat.id)}
              testID={`category-${cat.id}`}
            >
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon
                name={getCategoryIcon(cat.name)}
                size={14}
                color={categoryId === cat.id ? colors.white : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  categoryId === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addCategoryChip}
            onPress={() => setShowAddCategory(true)}
            testID="add-category-button"
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="plus" size={14} color={colors.primary} />
            <Text style={styles.addCategoryText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Date & Amount ────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="calendar-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Date & Amount</Text>
      </View>
      <View style={styles.card}>
        <DatePickerInput
          label="Date"
          value={date}
          onChange={setDate}
          maximumDate={new Date()}
          placeholder="Select date"
          testID="expense-date-input"
        />

        <Text style={styles.fieldLabel}>AMOUNT *</Text>
        <View style={[styles.amountRow, amount !== '' && parseFloat(amount) > 0 && styles.amountRowFilled]}>
          <View style={styles.currencyCircle}>
            <Text style={styles.currencySymbol}>{'\u20B9'}</Text>
          </View>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={colors.textDisabled}
            maxLength={10}
            testID="expense-amount-input"
          />
        </View>
      </View>

      {/* ── Notes ────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="note-text-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Notes</Text>
      </View>
      <View style={styles.card}>
        <TextArea
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this expense..."
          testID="expense-notes-input"
        />
      </View>

      {/* ── Buttons ──────────────────────────────────── */}
      {mode === 'edit' ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            testID="expense-delete-button"
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="trash-can-outline" size={20} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            testID="expense-save-button"
          >
            {!saving && (
              // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
              <Icon name="content-save-outline" size={20} color={colors.white} />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.saveButtonFull, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          testID="expense-save-button"
        >
          {!saving && (
            // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
            <Icon name="content-save-outline" size={20} color={colors.white} />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Add Category Modal ──────────────────────── */}
      <Modal
        visible={showAddCategory}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCategory(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddCategory(false)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="shape-outline" size={22} color={colors.primary} />
                  <Text style={styles.modalTitle}>New Category</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowAddCategory(false)}
                  style={styles.modalCloseBtn}
                  testID="close-add-category"
                >
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalFieldLabel}>CATEGORY NAME</Text>
              <View style={styles.modalInputWrap}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="tag-outline" size={18} color={colors.textDisabled} />
                <TextInput
                  style={styles.modalInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g. Office Supplies"
                  placeholderTextColor={colors.textDisabled}
                  autoFocus
                  maxLength={50}
                  testID="new-category-input"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowAddCategory(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, addingCategory && styles.saveButtonDisabled]}
                  onPress={handleAddCategory}
                  disabled={addingCategory}
                  testID="save-category-button"
                >
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="plus" size={18} color={colors.white} />
                  <Text style={styles.modalSaveText}>
                    {addingCategory ? 'Adding...' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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

  /* ── Category ────────────────────────────────────── */
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
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
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addCategoryText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },

  /* ── Amount ──────────────────────────────────────── */
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  amountRowFilled: {
    borderColor: colors.primary,
  },
  currencyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    paddingVertical: 14,
  },

  /* ── Buttons ─────────────────────────────────────── */
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.base,
  },
  saveButtonFull: {
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
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.xl,
    padding: spacing.base,
  },
  deleteButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },

  /* ── Modal ───────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: 320,
    maxWidth: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
  },
  modalSaveText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
});
