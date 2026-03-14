const MAX_LENGTH = 128;

export function generateRequestId(): string {
  // Use a simple random hex string (no external dependency needed)
  const bytes = new Uint8Array(16);
  const g = globalThis as unknown as { crypto?: { getRandomValues(arr: Uint8Array): void } };
  const crypto = g.crypto;
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sanitizeRequestId(value: string | null | undefined): string | null {
  if (!value || value.length === 0 || value.length > MAX_LENGTH) return null;
  return value;
}
