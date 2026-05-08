import React, { useMemo } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type SegmentedControlProps = {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  testID?: string;
  /**
   * Optional per-segment counter badge. Same length as `segments`. When the
   * value is a positive number, a small pill renders next to the label
   * (e.g. "Approvals · 3"). `undefined`, `null`, or `0` hides the badge —
   * an action-required indicator should disappear cleanly when there's
   * nothing to do. Counts above 99 collapse to "99+" so the pill stays
   * narrow.
   */
  badges?: ReadonlyArray<number | undefined>;
};

function formatBadge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function SegmentedControl({
  segments,
  selectedIndex,
  onSelect,
  testID,
  badges,
}: SegmentedControlProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} testID={testID} accessibilityRole="tablist">
      {segments.map((label, index) => {
        const isSelected = selectedIndex === index;
        const badge = badges?.[index];
        const showBadge = typeof badge === 'number' && badge > 0;
        return (
          <Pressable
            key={label}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            // Surface the badge to assistive tech so screen-reader users
            // get the same "needs attention" cue as visual users.
            accessibilityLabel={showBadge ? `${label}, ${badge} pending` : undefined}
            testID={`segment-${index}`}
          >
            <View style={styles.labelRow}>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
              {showBadge && (
                <View
                  style={styles.badge}
                  testID={`segment-${index}-badge`}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {/* Brand gradient mirrors the active-state language used
                      across the app (active filter pills, FAB, primary
                      buttons). The badge inherits "this is the brand's
                      attention color" rather than overloading red/danger
                      semantics for a routine review-pending workflow. */}
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.badgeText}>{formatBadge(badge)}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.xl,
      padding: spacing.xs,
      marginBottom: spacing.md,
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm + 3,
      alignItems: 'center',
      borderRadius: radius.lg,
      minHeight: 44,
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    labelSelected: {
      color: colors.text,
      fontWeight: fontWeights.bold,
    },
    badge: {
      // Mirrors the existing in-tab pill style ("All 1" / "Parent 1" inside
      // PendingApprovalsScreen) for visual consistency.
      minWidth: 22,
      height: 22,
      paddingHorizontal: 7,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      // overflow:hidden so the LinearGradient absolute fill clips to the
      // pill's rounded corners.
      overflow: 'hidden',
      // shadows.sm gives the pill a subtle lift on both selected (white
      // surface) and unselected (dark bgSubtle) segment backgrounds —
      // important so the badge reads as "elevated above the tab" rather
      // than "stuck onto it".
      ...shadows.sm,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
      lineHeight: 14,
      // letterSpacing tightens "99+" so the three glyphs don't visually
      // overflow the pill — small but noticeable at this size.
      letterSpacing: -0.2,
      // includeFontPadding:false (Android) removes the default text-line
      // padding so the digit centers cleanly in the pill. No-op on iOS.
      includeFontPadding: false,
    },
  });
