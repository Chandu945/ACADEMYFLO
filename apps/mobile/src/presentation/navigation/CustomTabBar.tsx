import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/ui/AppIcon';
import { gradient } from '../theme';
import type { Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';

/** Icon name(s) per tab. Use a string for both states, or an object to give
 *  the active and inactive states different glyphs (e.g. filled vs outlined). */
export type TabIcon = string | { active: string; inactive: string };
export type IconMap = Record<string, TabIcon>;

type Props = BottomTabBarProps & {
  iconMap: IconMap;
};

function resolveIcon(entry: TabIcon | undefined, focused: boolean): string {
  if (!entry) return 'circle';
  if (typeof entry === 'string') return entry;
  return focused ? entry.active : entry.inactive;
}

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
        const iconName = resolveIcon(iconMap[route.name], isFocused);

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
            <View style={styles.iconTile}>
              {isFocused ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconTileGradient}
                />
              ) : null}
              <AppIcon
                name={iconName}
                size={22}
                color={isFocused ? '#FFFFFF' : colors.textDisabled}
              />
            </View>
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
    } as ViewStyle,
    iconTile: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    } as ViewStyle,
    iconTileGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 12,
    } as ViewStyle,
  });
