import { randomUUID } from 'node:crypto';

const MAX_LENGTH = 128;

export function generateRequestId(): string {
  return randomUUID();
}

export function sanitizeRequestId(value: string | null | undefined): string | null {
  if (!value || value.length === 0 || value.length > MAX_LENGTH) return null;
  return value;
}
