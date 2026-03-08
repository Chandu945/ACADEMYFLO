import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TokenService } from '@application/identity/ports/token-service.port';
import { TOKEN_SERVICE } from '@application/identity/ports/token-service.port';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Token revoked');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }

    if ((user.role === 'STAFF' || user.role === 'PARENT') && !user.isActive()) {
      throw new ForbiddenException('User account is inactive');
    }

    (request as unknown as Record<string, unknown>)['user'] = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    return true;
  }
}
