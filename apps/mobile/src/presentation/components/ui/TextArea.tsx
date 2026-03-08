import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type TextAreaProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  testID?: string;
};

export function TextArea({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  maxLength = 500,
  testID,
}: TextAreaProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        multiline
        numberOfLines={4}
        maxLength={maxLength}
        textAlignVertical="top"
        testID={testID}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.count}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 100,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  count: {
    fontSize: fontSizes.sm,
    color: colors.textDisabled,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
});
