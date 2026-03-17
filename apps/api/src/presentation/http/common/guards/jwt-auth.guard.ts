import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenService } from '@application/identity/ports/token-service.port';
import { TOKEN_SERVICE } from '@application/identity/ports/token-service.port';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CacheService } from '../../../../infrastructure/cache/cache.service';

interface CachedAuthUser {
  id: string;
  tokenVersion: number;
  status: string;
  role: string;
  academyId: string | null;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = this.tokenService.verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const cacheKey = `user:auth:${payload.sub}`;
    let user = await this.cacheService.get<CachedAuthUser>(cacheKey);

    if (!user) {
      const dbUser = await this.userRepo.findById(payload.sub);
      if (!dbUser) {
        throw new UnauthorizedException('Token revoked');
      }
      user = {
        id: dbUser.id.toString(),
        tokenVersion: dbUser.tokenVersion,
        status: dbUser.status,
        role: dbUser.role,
        academyId: dbUser.academyId,
        email: dbUser.emailNormalized,
      };
      await this.cacheService.set(cacheKey, user, 300); // 5 min cache
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      // Cache may be stale (e.g. after token refresh incremented tokenVersion).
      // Re-fetch from DB before rejecting.
      await this.cacheService.del(cacheKey);
      const freshUser = await this.userRepo.findById(payload.sub);
      if (!freshUser || freshUser.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Token revoked');
      }
      user = {
        id: freshUser.id.toString(),
        tokenVersion: freshUser.tokenVersion,
        status: freshUser.status,
        role: freshUser.role,
        academyId: freshUser.academyId,
        email: freshUser.emailNormalized,
      };
      await this.cacheService.set(cacheKey, user, 300);
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is inactive');
    }

    (request as unknown as Record<string, unknown>)['user'] = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      academyId: payload.academyId,
    };

    return true;
  }
}
