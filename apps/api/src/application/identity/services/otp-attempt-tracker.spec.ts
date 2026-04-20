import { OtpAttemptTracker } from './otp-attempt-tracker';

type Stored = { count: number; lockedUntil: number | null };

function makeCache() {
  const store = new Map<string, Stored>();
  return {
    get: jest.fn(async (k: string) => store.get(k) ?? undefined),
    set: jest.fn(async (k: string, v: Stored, _ttl?: number) => {
      store.set(k, v);
    }),
    del: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    _store: store,
  };
}

describe('OtpAttemptTracker', () => {
  it('is not locked initially', async () => {
    const cache = makeCache();
    const tracker = new OtpAttemptTracker(cache as never);
    expect(await tracker.isLocked('a@b.com')).toBe(false);
  });

  it('locks the email after 10 failures', async () => {
    const cache = makeCache();
    const tracker = new OtpAttemptTracker(cache as never);
    for (let i = 0; i < 9; i++) await tracker.recordFailure('a@b.com');
    expect(await tracker.isLocked('a@b.com')).toBe(false);
    await tracker.recordFailure('a@b.com');
    expect(await tracker.isLocked('a@b.com')).toBe(true);
  });

  it('unlocks after the lockout window passes', async () => {
    const cache = makeCache();
    const tracker = new OtpAttemptTracker(cache as never);
    for (let i = 0; i < 10; i++) await tracker.recordFailure('a@b.com');
    expect(await tracker.isLocked('a@b.com')).toBe(true);

    // Simulate elapsed time by mutating the stored lockedUntil
    const record = cache._store.get('otp-attempt:a@b.com')!;
    record.lockedUntil = Date.now() - 1;
    cache._store.set('otp-attempt:a@b.com', record);

    expect(await tracker.isLocked('a@b.com')).toBe(false);
  });

  it('recordSuccess clears the counter', async () => {
    const cache = makeCache();
    const tracker = new OtpAttemptTracker(cache as never);
    for (let i = 0; i < 10; i++) await tracker.recordFailure('a@b.com');
    await tracker.recordSuccess('a@b.com');
    expect(await tracker.isLocked('a@b.com')).toBe(false);
  });

  it('is case-insensitive on email', async () => {
    const cache = makeCache();
    const tracker = new OtpAttemptTracker(cache as never);
    await tracker.recordFailure('Foo@Bar.COM');
    expect(cache._store.has('otp-attempt:foo@bar.com')).toBe(true);
  });
});
