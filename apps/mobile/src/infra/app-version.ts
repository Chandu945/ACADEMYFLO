import { Platform } from 'react-native';

// Bump this on every app store release
export const APP_VERSION = '1.0.0';

export const APP_PLATFORM: 'android' | 'ios' | 'web' =
  Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';
