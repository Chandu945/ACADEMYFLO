import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  value: number; // 0..5 (0 = unrated)
  onChange?: (next: number) => void;
  size?: number;
  disabled?: boolean;
  color?: string;
};

// Simple 5-star picker. Read-only when onChange is omitted. Taps on a star
// set the rating to that index; tapping the same star again clears back to 0
// so the parent can explicitly "unrate" before submitting.
export function RatingStars({ value, onChange, size = 28, disabled, color }: Props) {
  const { colors } = useTheme();
  const active = color ?? '#F59E0B'; // amber
  const inactive = colors.textDisabled;

  const interactive = !!onChange && !disabled;

  return (
    <View style={styles.row} accessibilityRole="adjustable">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const icon = filled ? 'star' : 'star-outline';
        const color = filled ? active : inactive;
        const node = <AppIcon name={icon} size={size} color={color} />;

        if (!interactive) {
          return (
            <View key={i} style={styles.star}>
              {node}
            </View>
          );
        }

        return (
          <Pressable
            key={i}
            onPress={() => onChange!(value === i ? 0 : i)}
            style={styles.star}
            accessibilityLabel={`Rate ${i} out of 5`}
            hitSlop={6}
          >
            {node}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    padding: 2,
  },
});
