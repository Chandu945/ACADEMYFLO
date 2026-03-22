import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, type ViewStyle } from 'react-native';

import { spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll = true, style }: ScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView style={[styles.container, style]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
});
