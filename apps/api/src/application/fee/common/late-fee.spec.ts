import {
  buildLateFeeConfigFromAcademy,
  buildEffectiveLateFeeConfig,
  type LateFeeAcademyFields,
} from './late-fee';
import type { LateFeeConfig } from '@academyflo/contracts';

describe('buildLateFeeConfigFromAcademy', () => {
  const enabledAcademy: LateFeeAcademyFields = {
    lateFeeEnabled: true,
    gracePeriodDays: 5,
    lateFeeAmountInr: 100,
    lateFeeRepeatIntervalDays: 5,
  };

  it('builds a config from an enabled academy', () => {
    expect(buildLateFeeConfigFromAcademy(enabledAcademy)).toEqual({
      lateFeeEnabled: true,
      gracePeriodDays: 5,
      lateFeeAmountInr: 100,
      lateFeeRepeatIntervalDays: 5,
    });
  });

  it('returns undefined for a disabled academy', () => {
    expect(
      buildLateFeeConfigFromAcademy({ ...enabledAcademy, lateFeeEnabled: false }),
    ).toBeUndefined();
  });

  it('returns undefined for null or undefined input', () => {
    expect(buildLateFeeConfigFromAcademy(null)).toBeUndefined();
    expect(buildLateFeeConfigFromAcademy(undefined)).toBeUndefined();
  });
});

describe('buildEffectiveLateFeeConfig (L1 + M1 invariants)', () => {
  const liveConfig: LateFeeConfig = {
    lateFeeEnabled: true,
    gracePeriodDays: 5,
    lateFeeAmountInr: 150,
    lateFeeRepeatIntervalDays: 5,
  };

  // The snapshot represents the rate that was live when the fee became
  // DUE — typically lower than `liveConfig` after the owner raised the
  // rate. Used here to verify M1's "snapshot locks the amount" invariant.
  const snapshot: LateFeeConfig = {
    lateFeeEnabled: true,
    gracePeriodDays: 5,
    lateFeeAmountInr: 100,
    lateFeeRepeatIntervalDays: 5,
  };

  describe('L1: live disable is the kill-switch', () => {
    it('returns undefined when liveConfig is undefined, even with a snapshot', () => {
      // The bug L1 fixes: snapshot used to win when liveConfig was disabled,
      // causing the owner-disabled-but-still-charging surprise.
      expect(buildEffectiveLateFeeConfig(snapshot, undefined)).toBeUndefined();
    });

    it('returns undefined when both liveConfig and snapshot are absent', () => {
      expect(buildEffectiveLateFeeConfig(null, undefined)).toBeUndefined();
    });
  });

  describe('M1: snapshot locks the amount when late fee is enabled', () => {
    it('prefers the snapshot when both are present (rate-change protection)', () => {
      // Owner raised the rate from ₹100 (when fee flipped) to ₹150 (now).
      // The snapshot wins — fee keeps the rate it had when it became DUE.
      expect(buildEffectiveLateFeeConfig(snapshot, liveConfig)).toEqual(snapshot);
    });

    it('falls back to liveConfig when no snapshot is present', () => {
      // E.g., a fee that flipped to DUE before the M1 fix shipped, or a
      // fee that flipped while late-fee was disabled and was never
      // snapshotted. Live config provides the answer.
      expect(buildEffectiveLateFeeConfig(null, liveConfig)).toEqual(liveConfig);
    });
  });

  describe('re-enable scenario: snapshot stays valid through a disable/enable cycle', () => {
    it('resumes accrual at the snapshotted rate after a re-enable', () => {
      // Owner disables → buildEffectiveLateFeeConfig returns undefined →
      // late fee = 0 for the parent's view.
      expect(buildEffectiveLateFeeConfig(snapshot, undefined)).toBeUndefined();

      // Owner toggles it back on later. liveConfig becomes defined again.
      // The snapshot is still on the fee, so accrual resumes at the
      // SAME rate as before (₹100, not the new ₹150 live rate).
      expect(buildEffectiveLateFeeConfig(snapshot, liveConfig)).toEqual(snapshot);
    });
  });
});
