type AppEnv = 'development' | 'staging' | 'production';

type EnvConfig = {
  API_BASE_URL: string;
  APP_ENV: AppEnv;
  SENTRY_DSN: string;
};

import { Platform } from 'react-native';

const isWeb = typeof (globalThis as unknown as Record<string, unknown>)['document'] !== 'undefined';

// Android emulator uses 10.0.2.2 to reach host machine; iOS simulator uses localhost
const devApiHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// Sentry DSN is not a secret — it's designed to be embedded in client apps.
// Same DSN is reused across environments; events are separated by the
// `environment` tag that sentry-init.ts passes to Sentry.init().
const SENTRY_DSN =
  'https://b0fe0a6b7d8352517a2810d771c0bf7e@o4511229049307136.ingest.us.sentry.io/4511229051142144';

const ENV_MAP: Record<AppEnv, EnvConfig> = {
  development: {
    API_BASE_URL: isWeb ? '' : `http://${devApiHost}:3001`,
    APP_ENV: 'development',
    SENTRY_DSN,
  },
  staging: {
    API_BASE_URL: 'https://staging-api.playconnect.in',
    APP_ENV: 'staging',
    SENTRY_DSN,
  },
  production: {
    API_BASE_URL: 'https://playconnect-8g17.onrender.com',
    APP_ENV: 'production',
    SENTRY_DSN,
  },
};

// Default to development; overridden by build flavor at build time
const CURRENT_ENV: AppEnv = (__DEV__ ? 'development' : 'production') as AppEnv;

export const env: EnvConfig = ENV_MAP[CURRENT_ENV] ?? ENV_MAP.development;

declare const __DEV__: boolean;
