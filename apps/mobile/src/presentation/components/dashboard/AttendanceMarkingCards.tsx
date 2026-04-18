import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { getStaffDailyReport } from '../../../infra/staff-attendance/staff-attendance-api';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type CardData = {
  present: number;
  total: number;
};

function MarkingCard({
  title,
  icon,
  data,
  onPress,
}: {
  title: string;
  icon: string;
  data: CardData | null;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const present = data?.present ?? 0;
  const total = data?.total ?? 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={styles.cardIconCircle}>
        
        <AppIcon name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>Marking Attendance</Text>

      <View style={styles.statsRow}>
        <Text style={styles.pctText}>{pct}%</Text>
        <Text style={styles.countText}>
          {present}/{total}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%` as any },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

type AttendanceMarkingCardsProps = {
  onStudentPress?: () => void;
  onStaffPress?: () => void;
  initialStudentData?: { present: number; total: number } | null;
};

export function AttendanceMarkingCards({ onStudentPress, onStaffPress, initialStudentData }: AttendanceMarkingCardsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [studentData, setStudentData] = useState<CardData | null>(initialStudentData ?? null);
  const [staffData, setStaffData] = useState<CardData | null>(null);
  const mountedRef = useRef(true);

  // Update student data when initialData arrives from dashboard KPIs
  useEffect(() => {
    if (initialStudentData) {
      setStudentData(initialStudentData);
    }
  }, [initialStudentData]);

  const load = useCallback(async () => {
    const today = getTodayStr();
    // Only fetch staff data — student data comes from dashboard KPIs
    const staffRes = await getStaffDailyReport(today);
    if (!mountedRef.current) return;

    if (staffRes.ok) {
      const total = staffRes.value.presentCount + staffRes.value.absentCount;
      setStaffData({ present: staffRes.value.presentCount, total });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return (
    <View style={styles.container} testID="attendance-marking-cards">
      <MarkingCard title="Student" icon="account-group-outline" data={studentData} onPress={onStudentPress} />
      <MarkingCard title="Staff" icon="account-tie-outline" data={staffData} onPress={onStaffPress} />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.md,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  pctText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  countText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textMedium,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
