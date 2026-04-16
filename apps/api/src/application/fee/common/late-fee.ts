import type { LateFeeConfig, LateFeeRepeatInterval } from '@playconnect/contracts';

/**
 * Minimal shape of an Academy that provides live late-fee config fields.
 * Kept structural so any Academy-like projection fits without a domain import.
 */
export interface LateFeeAcademyFields {
  lateFeeEnabled: boolean;
  gracePeriodDays: number;
  lateFeeAmountInr: number;
  lateFeeRepeatIntervalDays: number;
}

/**
 * Build a LateFeeConfig from an Academy's live late-fee fields.
 * Returns undefined if late-fee is disabled on the academy so the caller can
 * fall back to a snapshot or skip the computation entirely.
 */
export function buildLateFeeConfigFromAcademy(
  academy: LateFeeAcademyFields | null | undefined,
): LateFeeConfig | undefined {
  if (!academy?.lateFeeEnabled) return undefined;
  return {
    lateFeeEnabled: academy.lateFeeEnabled,
    gracePeriodDays: academy.gracePeriodDays,
    lateFeeAmountInr: academy.lateFeeAmountInr,
    lateFeeRepeatIntervalDays: academy.lateFeeRepeatIntervalDays as LateFeeRepeatInterval,
  };
}
