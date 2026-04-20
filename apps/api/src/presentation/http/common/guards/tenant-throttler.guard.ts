import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

type AuthedRequest = Request & { user?: { userId?: string } };

/**
 * ThrottlerGuard that keys quota by authenticated userId when present,
 * falling back to IP for pre-auth endpoints. Without this, corporate or
 * mobile-carrier NAT makes every user behind the same proxy IP share one
 * bucket — a single heavy tenant can throttle every other academy sharing
 * the same egress.
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: AuthedRequest): Promise<string> {
    const userId = req.user?.userId;
    if (userId) return Promise.resolve(`u:${userId}`);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || 'unknown';
    return Promise.resolve(`ip:${ip}`);
  }
}
