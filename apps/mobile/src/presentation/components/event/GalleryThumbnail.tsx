import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { radius, fontSizes, fontWeights, spacing } from '../../theme';
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
      style={[styles.container, { width: size, height: size }]}
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
          {/* @ts-expect-error react-native-vector-icons types */}
          <Icon name="check-circle" size={28} color={colors.white} />
        </View>
      )}
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
      style={[styles.addTile, { width: size, height: size }]}
      accessibilityRole="button"
      accessibilityLabel="Add photo"
      testID={testID}
    >
      {/* @ts-expect-error react-native-vector-icons types */}
      <Icon name="camera-plus-outline" size={32} color={colors.textDisabled} />
      <Text style={styles.addLabel}>Add Photo</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      borderRadius: radius.md,
      overflow: 'hidden',
      margin: 2,
    },
    image: {
      borderRadius: radius.md,
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTile: {
      borderRadius: radius.md,
      margin: 2,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSubtle,
    },
    addLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: colors.textDisabled,
      marginTop: spacing.xs,
    },
  });
