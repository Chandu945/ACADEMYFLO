import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  onSelectBatch: () => void;
  /** Optional — true while the batch list is still loading. */
  loading?: boolean;
  /** Optional — true if the academy has no batches configured. */
  noBatchesAvailable?: boolean;
};

/**
 * Empty state shown when no batch is selected. Attendance is session-scoped;
 * the user must explicitly pick which batch they're marking before the student
 * list appears.
 */
export function SelectBatchPrompt({ onSelectBatch, loading, noBatchesAvailable }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container} testID="select-batch-prompt">
      <View style={styles.iconWrap}>
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppIcon name="account-group-outline" size={44} color="#FFFFFF" />
      </View>

      <Text style={styles.title}>
        {noBatchesAvailable ? 'No batches yet' : 'Select a batch to mark attendance'}
      </Text>
      <Text style={styles.subtitle}>
        {noBatchesAvailable
          ? 'Create a batch in More → Batches, then come back here to mark attendance.'
          : 'Attendance is marked per session. Pick the batch whose students you\u2019re marking — morning, evening, or any other batch in your academy.'}
      </Text>

      {!noBatchesAvailable && (
        <TouchableOpacity
          style={styles.button}
          onPress={onSelectBatch}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Choose batch"
          testID="select-batch-prompt-button"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="gesture-tap" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {loading ? 'Loading batches…' : 'Choose Batch'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing['2xl'],
    },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: radius.full,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    title: {
      fontSize: fontSizes['xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 320,
      marginBottom: spacing.xl,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: 14,
      borderRadius: radius.full,
      overflow: 'hidden',
      minWidth: 200,
      ...shadows.sm,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      letterSpacing: 0.3,
    },
  });
