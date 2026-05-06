import React, { useMemo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type IconTint = 'primary' | 'success' | 'warning' | 'danger' | 'info';

type CardHeaderProps = {
  icon?: ReactNode;
  iconTint?: IconTint;
  title: string;
  onPress?: () => void;
  action?: ReactNode;
  testID?: string;
};

export function CardHeader({
  icon,
  iconTint,
  title,
  onPress,
  action,
  testID,
}: CardHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const TitleRowContainer: React.ComponentType<{ children: ReactNode }> = onPress
    ? ({ children }) => (
        <TouchableOpacity
          style={styles.titleRow}
          onPress={onPress}
          activeOpacity={0.7}
          testID={testID}
        >
          {children}
        </TouchableOpacity>
      )
    : ({ children }) => (
        <View style={styles.titleRow} testID={testID}>
          {children}
        </View>
      );

  const tintStyle = iconTint ? tintStyles(colors)[iconTint] : null;

  return (
    <View style={styles.container}>
      <TitleRowContainer>
        {icon ? (
          iconTint ? (
            <View style={[styles.iconCircle, tintStyle]}>{icon}</View>
          ) : (
            <View style={styles.icon}>{icon}</View>
          )
        ) : null}
        <Text
          style={styles.title}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.2}
        >
          {title}
        </Text>
        {onPress ? (
          <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
        ) : null}
      </TitleRowContainer>
      {action ? <View style={styles.actionRow}>{action}</View> : null}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      gap: spacing.md,
      marginBottom: spacing.base,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    icon: {
      flexShrink: 0,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      borderWidth: 1,
    },
    title: {
      flex: 1,
      flexShrink: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.2,
    },
    actionRow: {
      flexDirection: 'row',
      alignSelf: 'center',
    },
  });

const tintStyles = (colors: Colors) =>
  StyleSheet.create({
    primary: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primarySoft,
    },
    success: {
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
    },
    warning: {
      backgroundColor: colors.warningBg,
      borderColor: colors.warningBorder,
    },
    danger: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
    },
    info: {
      backgroundColor: colors.infoBg,
      borderColor: colors.border,
    },
  });
