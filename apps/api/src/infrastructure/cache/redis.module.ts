import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheServiceUserAuthCacheAdapter } from './cache-service-user-auth-cache.adapter';
import { USER_AUTH_CACHE_PORT } from '@application/identity/ports/user-auth-cache.port';

@Global()
@Module({
  providers: [
    CacheService,
    // H1 identity-audit fix: provide UserAuthCachePort globally so the
    // tokenVersion / status mutators (password reset, change-password,
    // admin force-logout / disable, staff deactivation) can bust the
    // `user:auth:{userId}` cache that JwtAuthGuard reads.
    { provide: USER_AUTH_CACHE_PORT, useClass: CacheServiceUserAuthCacheAdapter },
  ],
  exports: [CacheService, USER_AUTH_CACHE_PORT],
})
export class CacheModule {}
