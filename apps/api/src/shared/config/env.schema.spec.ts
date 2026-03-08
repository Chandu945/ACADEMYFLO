import { envSchema } from './env.schema';

describe('envSchema', () => {
  it('should pass with valid environment variables', () => {
    const result = envSchema.safeParse({
      APP_ENV: 'development',
      NODE_ENV: 'development',
      PORT: '3001',
      TZ: 'Asia/Kolkata',
      LOG_LEVEL: 'debug',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_ENV).toBe('development');
      expect(result.data.PORT).toBe(3001);
      expect(result.data.TZ).toBe('Asia/Kolkata');
    }
  });

  it('should apply defaults for missing optional fields', () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_ENV).toBe('development');
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.PORT).toBe(3001);
      expect(result.data.TZ).toBe('Asia/Kolkata');
      expect(result.data.LOG_LEVEL).toBe('info');
    }
  });

  it('should fail when APP_ENV has an invalid value', () => {
    const result = envSchema.safeParse({
      APP_ENV: 'invalid_env',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const appEnvError = result.error.issues.find((i) => i.path[0] === 'APP_ENV');
      expect(appEnvError).toBeDefined();
    }
  });

  it('should fail when PORT is not a valid number', () => {
    const result = envSchema.safeParse({
      PORT: 'not_a_number',
    });

    expect(result.success).toBe(false);
  });

  it('should coerce PORT from string to number', () => {
    const result = envSchema.safeParse({
      PORT: '4000',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(4000);
      expect(typeof result.data.PORT).toBe('number');
    }
  });

  it('should accept all valid APP_ENV values', () => {
    for (const env of ['development', 'staging', 'production']) {
      const result = envSchema.safeParse({ APP_ENV: env });
      expect(result.success).toBe(true);
    }
  });

  it('should accept MONGODB_URI as optional', () => {
    const withUri = envSchema.safeParse({
      MONGODB_URI: 'mongodb://localhost:27017/test',
    });
    expect(withUri.success).toBe(true);

    const withoutUri = envSchema.safeParse({});
    expect(withoutUri.success).toBe(true);
    if (withoutUri.success) {
      expect(withoutUri.data.MONGODB_URI).toBeUndefined();
    }
  });
});
