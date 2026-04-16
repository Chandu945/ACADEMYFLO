import { randomUUID } from 'node:crypto';
import { anonymizedPhoneFor } from './deletion-strategy';

// Phone VO regex, duplicated here so the test is independent of the domain
// layer import path. Any change in the VO should be reflected here too.
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

describe('anonymizedPhoneFor', () => {
  it('produces a valid E.164 phone number', () => {
    const phone = anonymizedPhoneFor('3b2e9c7a-5f1a-4d8a-8b6c-e2f0a1b4d9c7');
    expect(phone).toMatch(E164_REGEX);
  });

  it('always uses the +9100 placeholder prefix', () => {
    for (let i = 0; i < 10; i++) {
      const phone = anonymizedPhoneFor(randomUUID());
      expect(phone.startsWith('+9100')).toBe(true);
      expect(phone).toHaveLength(15); // +9100 + 10 digits
    }
  });

  it('is deterministic — same UUID always yields the same phone', () => {
    const uid = 'deadbeef-0000-4000-8000-000000000001';
    const first = anonymizedPhoneFor(uid);
    const second = anonymizedPhoneFor(uid);
    expect(first).toBe(second);
  });

  it('produces different phones for different UUIDs', () => {
    const phones = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      phones.add(anonymizedPhoneFor(randomUUID()));
    }
    // Birthday collision probability across 1000 draws from 10^10 slots is
    // ~5 × 10^-5 — effectively zero for this sample size.
    expect(phones.size).toBe(1000);
  });

  it('handles a UUID with no numeric characters', () => {
    // Hypothetical edge case the old algorithm fell over on — all hex letters
    // produced '0000000000' and collided with the seed admin placeholder.
    const uid = 'abcdefab-cdef-4abc-8def-abcdefabcdef';
    const phone = anonymizedPhoneFor(uid);
    expect(phone).toMatch(E164_REGEX);
    expect(phone).not.toBe('+910000000000'); // ≠ seed admin placeholder
  });

  it('never produces the super-admin seed placeholder for realistic UUIDs', () => {
    // Run 10k iterations; probability of hitting the specific '0000000000'
    // tail is 10^-10 per UUID, so effectively impossible.
    for (let i = 0; i < 10_000; i++) {
      expect(anonymizedPhoneFor(randomUUID())).not.toBe('+910000000000');
    }
  });
});
