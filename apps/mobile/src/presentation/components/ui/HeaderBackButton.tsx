import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../context/ThemeContext';

type HeaderBackButtonProps = {
  onPress: () => void;
};

export function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <AppIcon name="arrow-left" size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  pressed: {
    opacity: 0.6,
  },
});
