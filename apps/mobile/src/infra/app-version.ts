import { Platform } from 'react-native';
// Single source of truth for the app's user-facing version. The Android
// `versionName` in apps/mobile/android/app/build.gradle MUST be kept in sync
// with this — that's enforced by scripts/check-version-sync.mjs in CI.
// (See also: APP_VERSION is sent to the /health/app-version endpoint to drive
// the force-update gate; if these drift the gate misfires.)
import { version as PACKAGE_VERSION } from '../../package.json';

export const APP_VERSION: string = PACKAGE_VERSION;

export const APP_PLATFORM: 'android' | 'ios' | 'web' =
  Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';
