/**
 * Sanitizes string inputs:
 * - Trims leading/trailing whitespace
 * - Collapses multiple consecutive spaces into one
 * - Normalizes emails to lowercase
 */

export function trimAndCollapse(value: string): string {
  return value.trim().replace(/\s{2,}/g, ' ');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.trim();
}
