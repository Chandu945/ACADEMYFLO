import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { Badge } from '../ui/Badge';
import type { StudentListItem } from '../../../domain/student/student.types';
import { AppCard } from '../ui/AppCard';
import { spacing, fontSizes, fontWeights } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type StudentRowProps = {
  student: StudentListItem;
  onPress: (student: StudentListItem) => void;
  onLongPress?: (student: StudentListItem) => void;
};

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'INACTIVE': return 'warning';
    case 'LEFT': return 'danger';
    default: return 'neutral';
  }
}

function formatFee(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `\u20B9${lakhs.toFixed(lakhs >= 10 ? 1 : 2)}L`;
  }
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function StudentRowComponent({ student, onPress, onLongPress }: StudentRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = useCallback(() => onPress(student), [onPress, student]);
  const handleLongPress = useCallback(() => onLongPress?.(student), [onLongPress, student]);

  const contactNumber = student.guardian?.mobile ?? student.mobileNumber ?? null;

  return (
    <AppCard
      style={styles.card}
      onPress={handlePress}
      onLongPress={handleLongPress}
      testID={`student-row-${student.id}`}
    >
      {student.profilePhotoUrl ? (
        <Image source={{ uri: student.profilePhotoUrl }} style={styles.avatar} />
      ) : (
        <InitialsAvatar
          name={student.fullName}
          size={44}
          style={styles.avatarSpacing}
        />
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {student.fullName}
        </Text>
        <View style={styles.metaRow}>
          <Badge label={student.status} variant={getStatusVariant(student.status)} dot uppercase />
          {contactNumber && (
            <View style={styles.phoneMeta}>
              <AppIcon name="phone-outline" size={12} color={colors.textDisabled} />
              <Text style={styles.phoneText} numberOfLines={1}>
                {contactNumber}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.feeContainer}>
        <Text
          style={styles.fee}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {formatFee(student.monthlyFee)}
        </Text>
        <Text style={styles.feeLabel}>/ month</Text>
      </View>
      <AppIcon name="chevron-right" size={18} color={colors.textDisabled} />
    </AppCard>
  );
}

export const StudentRow = memo(StudentRowComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
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
  avatarSpacing: {
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  phoneMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  phoneText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  feeContainer: {
    alignItems: 'flex-end',
    minWidth: 72,
    maxWidth: 120,
  },
  fee: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  feeLabel: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
});
