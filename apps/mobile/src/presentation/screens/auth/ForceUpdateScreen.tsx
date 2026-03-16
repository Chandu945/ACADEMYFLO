import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Button } from '../../components/ui/Button';
import { spacing, fontSizes, fontWeights } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  storeUrl: string;
  minVersion: string;
};

export function ForceUpdateScreen({ storeUrl, minVersion }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update Required</Text>
      <Text style={styles.message}>
        A new version ({minVersion}) of PlayConnect is available. Please update to continue using
        the app.
      </Text>
      <Button
        title="Update Now"
        onPress={() => Linking.openURL(storeUrl)}
        testID="update-button"
      />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    title: {
      fontSize: fontSizes['2xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    message: {
      fontSize: fontSizes.base,
      color: colors.textMedium,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing.xl,
    },
  });
