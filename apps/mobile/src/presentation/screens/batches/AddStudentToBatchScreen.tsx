import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BatchesStackParamList } from '../../navigation/BatchesStack';
import type { StudentListItem } from '../../../domain/student/student.types';
import { listStudents } from '../../../infra/student/student-api';
import { addStudentToBatch } from '../../../infra/batch/batch-api';
import { AppCard } from '../../components/ui/AppCard';
import { AppIcon } from '../../components/ui/AppIcon';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, listDefaults, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type AddRoute = RouteProp<BatchesStackParamList, 'AddStudentToBatch'>;

const PAGE_SIZE = 20;

export function AddStudentToBatchScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<AddRoute>();
  const batchId = route.params?.batchId ?? '';
  const existingStudentIds = route.params?.existingStudentIds ?? [];

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capacityModalVisible, setCapacityModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set(existingStudentIds));
  const [addingId, setAddingId] = useState<string | null>(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStudents = useCallback(
    async (page: number, searchQuery: string, append = false) => {
      try {
        const result = await listStudents({ status: 'ACTIVE', search: searchQuery || undefined }, page, PAGE_SIZE);

        if (result.ok) {
          const data = result.value;
          setStudents((prev) => (append ? [...prev, ...data.data] : data.data));
          hasMoreRef.current = page < data.meta.totalPages;
          setError(null);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        if (__DEV__) console.error('[AddStudentToBatchScreen] fetchStudents failed:', err);
        setError('Something went wrong. Please try again.');
      }
    },
    [],
  );

  const loadInitial = useCallback(
    async (searchQuery: string) => {
      setLoading(true);
      pageRef.current = 1;
      try {
        await fetchStudents(1, searchQuery);
      } catch (err) {
        if (__DEV__) console.error('[AddStudentToBatchScreen] loadInitial failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchStudents],
  );

  useEffect(() => {
    loadInitial('');
  }, [loadInitial]);

  // Clear search debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        loadInitial(text);
      }, 300);
    },
    [loadInitial],
  );

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    try {
      await fetchStudents(nextPage, search, true);
    } catch (err) {
      if (__DEV__) console.error('[AddStudentToBatchScreen] fetchMore failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, fetchStudents, search]);

  const handleAdd = useCallback(
    async (student: StudentListItem) => {
      // Guard against double-tap: if another add is already in flight, or the
      // student is already in the batch, short-circuit so we don't POST twice.
      if (addingId !== null || addedIds.has(student.id)) return;
      setAddingId(student.id);
      try {
        const result = await addStudentToBatch(batchId, student.id);
        if (result.ok) {
          setAddedIds((prev) => new Set(prev).add(student.id));
        } else {
          // Capacity-full is a foreseen domain conflict — promote it to a
          // modal so the owner clearly understands they must edit the batch
          // size before continuing, instead of dismissing an inline banner
          // and tapping "Add" again.
          const msg = result.error.message ?? '';
          const isCapacityFull =
            result.error.code === 'CONFLICT' &&
            /maximum.*capacity|capacity.*maximum|reached.*capacity/i.test(msg);
          if (isCapacityFull) {
            setCapacityModalVisible(true);
          } else {
            setError(msg);
          }
        }
      } catch (err) {
        if (__DEV__) console.error('[AddStudentToBatchScreen] handleAdd failed:', err);
        setError('Failed to add student. Please try again.');
      } finally {
        setAddingId(null);
      }
    },
    [batchId, addingId, addedIds],
  );

  const renderItem = useCallback(
    ({ item }: { item: StudentListItem }) => {
      const isAdded = addedIds.has(item.id);
      const isAdding = addingId === item.id;

      return (
        <AppCard style={isAdded ? { ...styles.studentCard, ...styles.studentCardAdded } : styles.studentCard}>
          <View style={styles.studentInfo}>
            <Text style={[styles.studentName, isAdded && styles.studentNameAdded]} numberOfLines={1}>
              {item.fullName}
            </Text>
            <Text style={styles.studentFee}>{`\u20B9${item.monthlyFee?.toLocaleString('en-IN') ?? 0}`}</Text>
          </View>
          {isAdded ? (
            <Text style={styles.addedLabel}>Added</Text>
          ) : (
            <Pressable
              onPress={() => handleAdd(item)}
              disabled={isAdding}
              style={styles.addBtn}
              accessibilityLabel={`Add ${item.fullName} to batch`}
              accessibilityRole="button"
              testID={`add-student-${item.id}`}
            >
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {isAdding ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.addBtnText}>Add</Text>
              )}
            </Pressable>
          )}
        </AppCard>
      );
    },
    [addedIds, addingId, handleAdd, styles, colors],
  );

  const keyExtractor = useCallback((item: StudentListItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors, styles]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search students to add to batch"
          testID="search-input"
        />
      </View>

      {error && <InlineError message={error} onRetry={() => loadInitial(search)} />}

      {loading ? (
        <View style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : (
        <FlatList
          data={students}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={<EmptyState message="No students found" />}
          ListFooterComponent={renderFooter}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          removeClippedSubviews
          windowSize={11}
          maxToRenderPerBatch={5}
          contentContainerStyle={styles.listContent}
          testID="add-student-list"
        />
      )}

      <Modal
        visible={capacityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCapacityModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <AppIcon name="account-group-outline" size={36} color={colors.warning} />
            </View>
            <Text style={styles.modalTitle}>Batch is Full</Text>
            <Text style={styles.modalBody}>
              This batch has reached its maximum student capacity. To add more
              students, edit the batch and increase its capacity first.
            </Text>
            <TouchableOpacity
              style={styles.modalPrimary}
              onPress={() => setCapacityModalVisible(false)}
              activeOpacity={0.85}
              testID="capacity-modal-ok"
            >
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.modalPrimaryText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchContainer: {
    padding: spacing.base,
    paddingBottom: 0,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  skeletons: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  studentCardAdded: {
    opacity: 0.6,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  studentNameAdded: {
    color: colors.textDisabled,
  },
  studentFee: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  addedLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textDisabled,
    marginLeft: spacing.md,
  },
  addBtn: {
    overflow: 'hidden',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    marginLeft: spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: listDefaults.contentPaddingBottom,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xl + spacing.sm,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  modalBody: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  modalPrimary: {
    overflow: 'hidden',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalPrimaryText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.white,
    letterSpacing: 0.1,
  },
});
