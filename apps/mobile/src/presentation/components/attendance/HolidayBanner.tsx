import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { fontSizes, fontWeights, radius, spacing, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type HolidayBannerProps = {
  isOwner: boolean;
  onRemoveHoliday?: () => void;
  removing?: boolean;
};

export function HolidayBanner({ isOwner, onRemoveHoliday, removing }: HolidayBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} testID="holiday-banner">
      <View style={styles.iconRow}>
        <AppIcon name="party-popper" size={24} color={colors.warningAccent} />
      </View>
      <Text style={styles.title}>Holiday Today</Text>
      <Text style={styles.subtitle}>Attendance is not required for this day</Text>
      {isOwner && onRemoveHoliday && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemoveHoliday}
          disabled={removing}
          activeOpacity={0.7}
          testID="remove-holiday-button"
        >
          {removing ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <AppIcon name="close-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.removeBtnText}>Remove Holiday</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  iconRow: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.warningLightBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgSubtle,
  },
  removeBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
});
