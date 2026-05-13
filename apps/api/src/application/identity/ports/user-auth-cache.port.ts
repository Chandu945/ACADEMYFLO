/**
 * Invalidates the per-user auth cache that JwtAuthGuard reads on every
 * request. Used wherever an auth-relevant user field changes (tokenVersion,
 * status, role) so a stolen / formerly-valid access token can't survive
 * the change for the duration of the cache TTL (H1 identity-audit fix).
 *
 * Implemented by a thin adapter over the shared CacheService — the use
 * cases depend on this port rather than the infra cache directly so the
 * architecture boundary stays intact.
 */
export const USER_AUTH_CACHE_PORT = Symbol('USER_AUTH_CACHE_PORT');

export interface UserAuthCachePort {
  /** Drop the `user:auth:{userId}` cache entry. Safe no-op if no entry exists. */
  invalidate(userId: string): Promise<void>;
  /** Drop entries for many users in one call (admin force-logout / academy
   *  disable). Implementation may parallelise — order isn't significant. */
  invalidateMany(userIds: string[]): Promise<void>;
}
