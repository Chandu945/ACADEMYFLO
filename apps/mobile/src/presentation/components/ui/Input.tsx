import React, { useState, useMemo, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, type TextInputProps } from 'react-native';
import { AppIcon } from './AppIcon';

import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  prefix?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  maxLength?: number;
  editable?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  testID?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  prefix,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  maxLength,
  editable,
  returnKeyType,
  onSubmitEditing,
  testID,
}, ref) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  const isPassword = secureTextEntry === true;

  const wrapperStyle = [
    styles.inputWrapper,
    focused && !error && styles.inputWrapperFocused,
    error ? styles.inputWrapperError : undefined,
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, error ? styles.labelError : undefined]}>{label}</Text>
      <View style={wrapperStyle}>
        {prefix ? (
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>{prefix}</Text>
            <View style={styles.prefixDivider} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          style={[styles.input, isPassword ? styles.inputWithToggle : undefined, prefix ? styles.inputWithPrefix : undefined]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={isPassword && !passwordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
          accessibilityState={{ disabled: editable === false }}
          accessibilityHint={error || undefined}
          testID={testID}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setPasswordVisible((prev) => !prev)}
            style={styles.toggleButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            testID={testID ? `${testID}-toggle` : 'password-toggle'}
          >
            <AppIcon
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <AppIcon name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  labelError: {
    color: colors.danger,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: spacing.base,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  inputWithToggle: {
    paddingRight: 4,
  },
  inputWithPrefix: {
    paddingLeft: spacing.sm,
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.base,
  },
  prefixText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  },
  prefixDivider: {
    width: 1.5,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: spacing.sm,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  error: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: fontWeights.medium,
  },
});
