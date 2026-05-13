import { InMemoryDeviceTokenRepository } from '../../../test/helpers/in-memory-repos';

/**
 * M1 notifications fix behavioral spec. Covers the contract that the
 * Mongo and InMemory impls share — the controller relies on this sweep
 * to make register authoritative for a given physical device.
 */
describe('DeviceTokenRepository.removeOthersByToken (M1 notifications fix)', () => {
  let repo: InMemoryDeviceTokenRepository;

  beforeEach(() => {
    repo = new InMemoryDeviceTokenRepository();
  });

  it('removes any prior user holding the same fcmToken, leaves current user alone', async () => {
    // The bug pattern: User A registered token X on a shared family
    // tablet, then logged out without unregistering. User B logs in on
    // the same device → register binds (B, X). Pre-M1 the (A, X) row
    // persisted, so pushes to A kept landing on B's screen. The sweep
    // is what the controller calls before the upsert to fix this.
    await repo.upsert('user-A', 'token-shared', 'android');
    await repo.upsert('user-B', 'token-shared', 'android');
    await repo.upsert('user-A', 'token-A-only', 'android');

    const removed = await repo.removeOthersByToken('user-B', 'token-shared');

    expect(removed).toBe(1);
    // user-B still has token-shared (their current registration).
    const bTokens = await repo.findByUserId('user-B');
    expect(bTokens.map((t) => t.fcmToken)).toContain('token-shared');
    // user-A no longer has token-shared (someone else owns the device now)
    // but still has their own token-A-only.
    const aTokens = await repo.findByUserId('user-A');
    expect(aTokens.map((t) => t.fcmToken)).not.toContain('token-shared');
    expect(aTokens.map((t) => t.fcmToken)).toContain('token-A-only');
  });

  it('returns 0 and no-ops when nobody else holds the token', async () => {
    // Single-user case: register on a non-shared device. Sweep is a
    // no-op and the upsert that follows runs unimpeded.
    await repo.upsert('user-A', 'token-A', 'ios');

    const removed = await repo.removeOthersByToken('user-A', 'token-A');
    expect(removed).toBe(0);
    const tokens = await repo.findByUserId('user-A');
    expect(tokens).toHaveLength(1);
  });

  it('does not touch the current user even when they registered the token earlier', async () => {
    // Re-registration (mobile app reinstall, FCM refresh) is also routed
    // through the sweep. It must not blow away the caller's own row —
    // otherwise the immediate-following upsert would have to re-insert
    // and lose audit/created timestamps unnecessarily.
    await repo.upsert('user-A', 'token-A', 'android');
    const removed = await repo.removeOthersByToken('user-A', 'token-A');
    expect(removed).toBe(0);
    expect(await repo.findByUserId('user-A')).toHaveLength(1);
  });
});
