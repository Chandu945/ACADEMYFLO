import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { UserRole } from '@academyflo/contracts';
import type { Result } from '@shared/kernel';
import { AppError, err, ok } from '@shared/kernel';
import type { AccountDeletionRequest } from '@domain/account-deletion/entities/account-deletion-request.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import { SESSION_REPOSITORY } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import { DEVICE_TOKEN_REPOSITORY } from '@domain/notification/ports/device-token.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import { PARENT_STUDENT_LINK_REPOSITORY } from '@domain/parent/ports/parent-student-link.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import { PAYMENT_REQUEST_REPOSITORY } from '@domain/fee/ports/payment-request.repository';
import type { UserAuthCachePort } from '@application/identity/ports/user-auth-cache.port';
import { USER_AUTH_CACHE_PORT } from '@application/identity/ports/user-auth-cache.port';
import { AcademyTeardownService } from '@infrastructure/services/academy-teardown.service';

/**
 * Generate a deterministic, collision-resistant placeholder phone for an
 * anonymized user.
 *
 *   Format: +9100XXXXXXXXXX (14 chars total, E.164-valid)
 *   Prefix: `+9100` — real Indian mobiles start `+91[6-9]`, so the `00` tail
 *           visually marks the value as a placeholder.
 *   Digits: first 8 bytes of SHA-256(uid) → BigInt mod 10^10 → 10 decimal
 *           digits zero-padded. Uses the full UUID entropy (vs. the old
 *           "last 10 of stripped numerics" that threw most of it away).
 *
 * Properties: deterministic (retry-safe — re-anonymizing produces the same
 * value, so no unique-index collision with itself), collision-resistant at
 * 10^10 slots (birthday bound ~100k inputs, vs. the old algorithm which
 * could collide within a single academy).
 */
export function anonymizedPhoneFor(uid: string): string {
  const hash = createHash('sha256').update(uid).digest();
  const bigint = BigInt('0x' + hash.subarray(0, 8).toString('hex'));
  const tenDigits = (bigint % 10_000_000_000n).toString().padStart(10, '0');
  return `+9100${tenDigits}`;
}

export interface DeletionStrategy {
  execute(request: AccountDeletionRequest): Promise<Result<void>>;
}

/**
 * Owner self-service deletion = full academy tenant teardown.
 *
 * Order:
 *   1. Anonymize every user belonging to the academy (owner + staff + parents).
 *      Their tokenVersion is bumped so any live session is invalidated on next
 *      request. PII fields (name, email, phone) are scrubbed.
 *   2. Hard-delete operational data (students, batches, attendance, fees, etc.)
 *      via AcademyTeardownService.
 *   3. Soft-delete (tombstone) the Academy row.
 *   4. Retain audit_logs and subscription_payments for compliance.
 */
@Injectable()
export class OwnerDeletionStrategy implements DeletionStrategy {
  private readonly logger = new Logger(OwnerDeletionStrategy.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly teardown: AcademyTeardownService,
  ) {}

  async execute(request: AccountDeletionRequest): Promise<Result<void>> {
    const owner = await this.users.findById(request.userId);
    if (!owner) return err(AppError.notFound('User', request.userId));
    if (owner.role !== 'OWNER') {
      return err(AppError.forbidden('Only OWNER deletions are supported.'));
    }
    const academyId = request.academyId ?? owner.academyId;
    if (!academyId) {
      return err(AppError.validation('Owner has no linked academy.'));
    }

    // Pull every user in the academy first — we anonymize each before we wipe
    // the rest of the academy data, so foreign-keys still resolve.
    const allUsers = await this.users.listByAcademyId(academyId);
    for (const u of allUsers) {
      const uid = u.id.toString();
      await this.users.anonymizeAndSoftDelete({
        userId: uid,
        anonymizedEmail: `deleted-${uid}@anonymized.local`,
        anonymizedPhoneE164: anonymizedPhoneFor(uid),
        anonymizedFullName: 'Deleted User',
        deletedBy: request.userId,
      });
    }

    const report = await this.teardown.teardown(academyId);
    this.logger.log(
      `Owner deletion complete for academy=${academyId} owner=${request.userId} ${JSON.stringify(report)}`,
    );
    return ok(undefined);
  }
}

/**
 * Self-only deletion for STAFF and PARENT roles. Anonymizes the requesting
 * user's PII, then runs the side-effect cascade so the academy doesn't
 * carry orphan references to the deleted user:
 *   - cancel pending payment requests they authored (so the owner's queue
 *     stops surfacing in-flight requests from someone who can't be reached);
 *   - delete parent-student links (so push fan-out / linked-parent UIs stop
 *     pointing at "Deleted User");
 *   - remove device tokens (so pushes stop being delivered to the device of
 *     someone who can no longer log in);
 *   - revoke sessions + invalidate the auth cache (so an in-flight access
 *     token is rejected immediately rather than after the 5-min cache TTL).
 *
 * Academy itself and other users remain untouched. Audit logs and payment
 * receipts referencing the user are retained for legal compliance — only
 * the user's own profile fields are scrubbed.
 *
 * Required for Play Store User Data policy: every signup-able role must have
 * an in-app self-deletion path.
 *
 * The cascade dependencies are @Optional so legacy fixtures (and the existing
 * deletion-strategy spec that predates the cascade) still compile without
 * the new wiring. Production DI always supplies them.
 */
@Injectable()
export class SelfOnlyDeletionStrategy implements DeletionStrategy {
  private readonly logger = new Logger(SelfOnlyDeletionStrategy.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Optional()
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequests?: PaymentRequestRepository,
    @Optional()
    @Inject(PARENT_STUDENT_LINK_REPOSITORY)
    private readonly parentLinks?: ParentStudentLinkRepository,
    @Optional()
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokens?: DeviceTokenRepository,
    @Optional()
    @Inject(SESSION_REPOSITORY)
    private readonly sessions?: SessionRepository,
    @Optional()
    @Inject(USER_AUTH_CACHE_PORT)
    private readonly userAuthCache?: UserAuthCachePort,
  ) {}

  async execute(request: AccountDeletionRequest): Promise<Result<void>> {
    const user = await this.users.findById(request.userId);
    if (!user) return err(AppError.notFound('User', request.userId));
    if (user.role === 'OWNER') {
      return err(
        AppError.forbidden('Owner deletions must use the OwnerDeletionStrategy.'),
      );
    }
    const uid = user.id.toString();
    const academyId = user.academyId ?? request.academyId ?? null;

    await this.users.anonymizeAndSoftDelete({
      userId: uid,
      anonymizedEmail: `deleted-${uid}@anonymized.local`,
      anonymizedPhoneE164: anonymizedPhoneFor(uid),
      anonymizedFullName: 'Deleted User',
      deletedBy: request.userId,
    });

    // Cascade. Each step is best-effort and isolated — a failure in one
    // shouldn't prevent the others from running. The user's PII is already
    // scrubbed above; cascade failures only leave orphan operational rows,
    // not exposed PII.
    let cancelledPRs = 0;
    let deletedLinks = 0;
    let removedTokens = 0;

    if (academyId && this.paymentRequests) {
      try {
        // Field is named `staffUserId` on the PR record but stores the
        // author for both parent- and staff-authored requests, so the
        // existing `cancelPendingByStaffAndAcademy` covers both roles.
        cancelledPRs = await this.paymentRequests.cancelPendingByStaffAndAcademy(uid, academyId);
      } catch (e) {
        this.logger.warn(`Failed to cancel pending PRs during self-delete: ${e}`);
      }
    }

    if (this.parentLinks && user.role === 'PARENT') {
      try {
        deletedLinks = await this.parentLinks.deleteAllByParentUserId(uid);
      } catch (e) {
        this.logger.warn(`Failed to delete parent-student links during self-delete: ${e}`);
      }
    }

    if (this.deviceTokens) {
      try {
        removedTokens = await this.deviceTokens.removeByUserIds([uid]);
      } catch (e) {
        this.logger.warn(`Failed to remove device tokens during self-delete: ${e}`);
      }
    }

    if (this.sessions) {
      try {
        await this.sessions.revokeAllByUserIds([uid]);
      } catch (e) {
        this.logger.warn(`Failed to revoke sessions during self-delete: ${e}`);
      }
    }

    if (this.userAuthCache) {
      try {
        await this.userAuthCache.invalidate(uid);
      } catch (e) {
        this.logger.warn(`Failed to invalidate auth cache during self-delete: ${e}`);
      }
    }

    // reason=AUTHOR_DELETED is captured in the log so forensic queries can
    // distinguish "user explicitly cancelled this PR" from "user's account
    // was deleted and the system cascade-cancelled it". The PR row itself
    // just shows status=CANCELLED — no schema change here.
    this.logger.log(
      `Self deletion complete for role=${user.role} user=${request.userId} ` +
        `cascade=reason=AUTHOR_DELETED cancelledPRs=${cancelledPRs} ` +
        `deletedLinks=${deletedLinks} removedTokens=${removedTokens}`,
    );
    return ok(undefined);
  }
}

export const DELETION_STRATEGY_REGISTRY = Symbol('DELETION_STRATEGY_REGISTRY');

export interface DeletionStrategyRegistry {
  for(role: UserRole): DeletionStrategy;
}

@Injectable()
export class DefaultDeletionStrategyRegistry implements DeletionStrategyRegistry {
  constructor(
    private readonly owner: OwnerDeletionStrategy,
    private readonly selfOnly: SelfOnlyDeletionStrategy,
  ) {}

  for(role: UserRole): DeletionStrategy {
    if (role === 'OWNER') return this.owner;
    if (role === 'STAFF' || role === 'PARENT') return this.selfOnly;
    throw new Error(
      `Account deletion is not supported for role '${role}'.`,
    );
  }
}
