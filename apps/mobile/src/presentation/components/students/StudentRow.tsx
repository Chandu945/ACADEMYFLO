import React, { memo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { StudentListItem } from '../../../domain/student/student.types';
import { AppCard } from '../ui/AppCard';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type StudentRowProps = {
  student: StudentListItem;
  onPress: () => void;
  onLongPress?: () => void;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#ecfdf5', text: colors.success },
  INACTIVE: { bg: '#fef9c3', text: '#a16207' },
  LEFT: { bg: '#fef2f2', text: colors.danger },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function StudentRowComponent({ student, onPress, onLongPress }: StudentRowProps) {
  const statusStyle = STATUS_COLORS[student.status] ?? { bg: colors.bgSubtle, text: colors.textDisabled };

  return (
    <AppCard style={styles.card} onPress={onPress} onLongPress={onLongPress} testID={`student-row-${student.id}`}>
      {student.profilePhotoUrl ? (
        <Image source={{ uri: student.profilePhotoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{getInitials(student.fullName)}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {student.fullName}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{student.status}</Text>
          </View>
          {student.guardian?.mobile && (
            <View style={styles.phoneMeta}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="phone-outline" size={12} color={colors.textDisabled} />
              <Text style={styles.phoneText}>{student.guardian.mobile}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.feeContainer}>
        <Text style={styles.fee}>{`\u20B9${student.monthlyFee}`}</Text>
        <Text style={styles.feeLabel}>/ month</Text>
      </View>
    </AppCard>
  );
}

export const StudentRow = memo(StudentRowComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  phoneMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  phoneText: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
  },
  feeContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  fee: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  feeLabel: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: 1,
  },
});
