import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../theme';

type HolidayBannerProps = {
  isOwner: boolean;
  onRemoveHoliday?: () => void;
  removing?: boolean;
};

export function HolidayBanner({ isOwner, onRemoveHoliday, removing }: HolidayBannerProps) {
  return (
    <View style={styles.container} testID="holiday-banner">
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="calendar-star" size={20} color={colors.warning} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Holiday Declared</Text>
          <Text style={styles.subtitle}>Attendance not required for this day</Text>
        </View>
      </View>
      {isOwner && onRemoveHoliday && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemoveHoliday}
          disabled={removing}
          activeOpacity={0.7}
          testID="remove-holiday-button"
        >
          {removing ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Text style={styles.removeBtnText}>Remove</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLightBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.warningText,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.warningText,
    marginTop: 1,
    opacity: 0.8,
  },
  removeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  removeBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },
});
