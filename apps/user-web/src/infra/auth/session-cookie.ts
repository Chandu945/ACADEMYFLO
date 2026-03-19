import 'server-only';

import { cookies } from 'next/headers';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { z } from 'zod';

import { publicEnv, serverEnv } from '@/infra/env';

const COOKIE_NAME = 'pc_user_session';
const ALGORITHM = 'aes-256-gcm';

const sessionPayloadSchema = z.object({
  refreshToken: z.string(),
  deviceId: z.string(),
  userId: z.string(),
  role: z.enum(['OWNER', 'STAFF', 'PARENT']),
  academyId: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

let _cachedKey: Buffer | null = null;
function getDerivedKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const { COOKIE_SECRET, COOKIE_SALT } = serverEnv();
  _cachedKey = scryptSync(COOKIE_SECRET, COOKIE_SALT, 32);
  return _cachedKey;
}

function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(encoded: string): string {
  const key = getDerivedKey();
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_APP_ENV } = publicEnv();

  const encrypted = encrypt(JSON.stringify(payload));

  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    sameSite: 'lax',
    secure: NEXT_PUBLIC_APP_ENV !== 'development',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function getSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const decrypted = decrypt(cookie.value);
    return sessionPayloadSchema.parse(JSON.parse(decrypted));
  } catch {
    await clearSessionCookie();
    return null;
  }
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: publicEnv().NEXT_PUBLIC_APP_ENV !== 'development',
    path: '/',
    maxAge: 0,
  });
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
