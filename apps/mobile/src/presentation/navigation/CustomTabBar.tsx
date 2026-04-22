import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/ui/AppIcon';
import { fontSizes, fontWeights, radius, gradient } from '../theme';
import type { Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';

type IconMap = Record<string, string>;

type Props = BottomTabBarProps & {
  iconMap: IconMap;
};

/**
 * Custom bottom tab bar. Active tab fills its 42px icon tile with the accent
 * gradient (135° #7C3AED → #3B82F6) and shows a white glyph. Inactive tabs
 * render a muted grey icon with no tile.
 */
export function CustomTabBar({ state, navigation, iconMap }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.bottom), [colors, insets.bottom]);

  return (
    <View style={styles.bar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const label = route.name;
        const iconName = iconMap[route.name] ?? 'circle';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
            testID={`tab-${route.name.toLowerCase()}`}
            style={styles.item}
          >
            <View style={[styles.iconTile, isFocused && styles.iconTileActive]}>
              {isFocused ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <AppIcon
                name={iconName}
                size={22}
                color={isFocused ? '#FFFFFF' : colors.textDisabled}
              />
            </View>
            <Text
              style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors, bottomInset: number) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.bg,
      paddingTop: 8,
      paddingBottom: Math.max(bottomInset, 8),
      paddingHorizontal: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    } as ViewStyle,
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
      gap: 4,
    } as ViewStyle,
    iconTile: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    iconTileActive: {
      overflow: 'hidden',
    } as ViewStyle,
    label: {
      fontSize: fontSizes.xs,
      letterSpacing: -0.1,
    },
    labelActive: {
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    labelInactive: {
      color: colors.textDisabled,
      fontWeight: fontWeights.medium,
    },
  });
