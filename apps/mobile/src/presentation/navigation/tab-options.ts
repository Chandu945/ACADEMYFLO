import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { fontSizes, fontWeights } from '../theme';
import type { Colors } from '../theme';

/**
 * Shared tab navigator screen options used by OwnerTabs, StaffTabs, and ParentTabs.
 * Accepts theme colors and safe-area bottom inset to compute consistent styling.
 */
export function makeTabScreenOptions(
  colors: Colors,
  bottomInset: number,
): BottomTabNavigationOptions {
  return {
    headerStyle: {
      backgroundColor: colors.surface,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
    } as BottomTabNavigationOptions['headerStyle'],
    headerTitleStyle: {
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.lg,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textDisabled,
    tabBarShowLabel: true,
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: fontWeights.medium,
      marginTop: -2,
      marginBottom: 2,
    },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopWidth: 0,
      elevation: 8,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      height: 60 + bottomInset,
      paddingTop: 4,
    },
  };
}
