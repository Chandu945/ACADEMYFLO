import { z } from 'zod';

const serverSchema = z.object({
  API_BASE_URL: z.string().url(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = serverSchema.parse({
    API_BASE_URL: process.env.API_BASE_URL,
  });
  return cachedServerEnv;
}

let cachedPublicEnv: z.infer<typeof publicSchema> | null = null;

export function publicEnv() {
  if (cachedPublicEnv) return cachedPublicEnv;
  cachedPublicEnv = publicSchema.parse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  });
  return cachedPublicEnv;
}
