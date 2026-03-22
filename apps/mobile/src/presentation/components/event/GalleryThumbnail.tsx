import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, Text } from 'react-native';
import { AppIcon } from '../ui/AppIcon';

import { radius, fontSizes, fontWeights, spacing, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  url: string;
  size: number;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  testID?: string;
};

export function GalleryThumbnail({
  url,
  size,
  onPress,
  onLongPress,
  selected = false,
  testID,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="View photo"
      testID={testID}
    >
      <Image
        source={{ uri: url }}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="cover"
      />
      {selected && (
        <View style={styles.selectedOverlay}>
          <AppIcon name="check-circle" size={28} color={colors.white} />
        </View>
      )}
      {/* Subtle inner shadow for depth */}
      <View style={styles.innerShadow} />
    </Pressable>
  );
}

export function AddPhotoTile({
  size,
  onPress,
  testID,
}: {
  size: number;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.addTile,
        { width: size, height: size },
        pressed && styles.addTilePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Add photo"
      testID={testID}
    >
      <View style={styles.addIconCircle}>
        <AppIcon name="camera-plus-outline" size={28} color={colors.primary} />
      </View>
      <Text style={styles.addLabel}>Add Photo</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    image: {
      borderRadius: radius.lg,
    },
    innerShadow: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTile: {
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.primary + '40',
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    addTilePressed: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    addIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    addLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  });
