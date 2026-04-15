import { z } from 'zod';

const UNSAFE_DEFAULTS = {
  SUPER_ADMIN_PASSWORD: 'change-me-in-production',
} as const;

export const envSchema = z
  .object({
    APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    TZ: z.string().default('Asia/Kolkata'),
    MONGODB_URI: z.string().startsWith('mongodb').optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // JWT
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900), // 15 minutes in seconds
    JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2592000), // 30 days in seconds

    // Bcrypt
    BCRYPT_COST: z.coerce.number().int().min(4).max(31).default(12),

    // SMTP / Email
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().default('noreply@playconnect.app'),
    EMAIL_DRY_RUN: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    FEE_REMINDER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SUBSCRIPTION_TIER_CRON_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

    // Performance
    INDEX_ASSERTION_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SLOW_QUERY_THRESHOLD_MS: z.coerce.number().int().positive().default(200),
    MONGODB_READ_PREFERENCE: z.enum(['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest']).default('secondaryPreferred'),

    // Swagger
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SWAGGER_TOKEN: z.string().default(''),

    // Observability
    METRICS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    METRICS_TOKEN: z.string().default(''),
    ERROR_TRACKING_DSN: z.string().default(''),

    // OTP / Password Reset
    OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    OTP_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),

    // Super Admin
    SUPER_ADMIN_EMAIL: z.string().default('admin@playconnect.app'),
    SUPER_ADMIN_PASSWORD: z.string().default(UNSAFE_DEFAULTS.SUPER_ADMIN_PASSWORD),

    // Reliability
    EXTERNAL_CALL_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),
    EXTERNAL_CALL_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
    SMTP_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),
    SHUTDOWN_GRACE_MS: z.coerce.number().int().min(1000).default(20_000),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().default(''),

    // Cloudflare R2 (S3-compatible image storage)
    R2_ACCOUNT_ID: z.string().default(''),
    R2_ACCESS_KEY_ID: z.string().default(''),
    R2_SECRET_ACCESS_KEY: z.string().default(''),
    R2_BUCKET_NAME: z.string().default(''),
    R2_ENDPOINT: z.string().default(''),
    R2_PUBLIC_BASE_URL: z.string().default(''),

    // Firebase (Push Notifications)
    FIREBASE_PROJECT_ID: z.string().default(''),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().default(''),

    // Mobile App Minimum Versions (force update)
    MIN_APP_VERSION_ANDROID: z.string().default('1.0.0'),
    MIN_APP_VERSION_IOS: z.string().default('1.0.0'),

    // CORS
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3002,http://localhost:3003,http://localhost:8081'),

    // Redis Cache
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    CACHE_TTL_SECONDS: z.coerce.number().int().min(10).default(300),

    // Cashfree Payment Gateway
    CASHFREE_CLIENT_ID: z.string().default(''),
    CASHFREE_CLIENT_SECRET: z.string().default(''),
    CASHFREE_WEBHOOK_SECRET: z.string().default(''),
    CASHFREE_API_VERSION: z.string().default('2025-01-01'),
    CASHFREE_BASE_URL: z.string().default('https://sandbox.cashfree.com/pg'),
  })
  .superRefine((val, ctx) => {
    if (val.APP_ENV !== 'production' && val.APP_ENV !== 'staging') return;

    if (val.SUPER_ADMIN_PASSWORD === UNSAFE_DEFAULTS.SUPER_ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPER_ADMIN_PASSWORD'],
        message: 'SUPER_ADMIN_PASSWORD must be changed from its default value in production/staging',
      });
    }
    if (!val.MONGODB_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGODB_URI'],
        message: 'MONGODB_URI is required in production/staging',
      });
    }
    if (val.SMTP_HOST === 'localhost') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST must not be localhost in production/staging',
      });
    }
    if (!val.CASHFREE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CASHFREE_WEBHOOK_SECRET'],
        message: 'CASHFREE_WEBHOOK_SECRET is required in production/staging',
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;
