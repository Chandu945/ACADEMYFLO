import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { UserRole } from '@playconnect/contracts';
import type { Result } from '@shared/kernel';
import { AppError, err, ok } from '@shared/kernel';
import type { AccountDeletionRequest } from '@domain/account-deletion/entities/account-deletion-request.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
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

export const DELETION_STRATEGY_REGISTRY = Symbol('DELETION_STRATEGY_REGISTRY');

export interface DeletionStrategyRegistry {
  for(role: UserRole): DeletionStrategy;
}

@Injectable()
export class DefaultDeletionStrategyRegistry implements DeletionStrategyRegistry {
  constructor(private readonly owner: OwnerDeletionStrategy) {}

  for(role: UserRole): DeletionStrategy {
    if (role === 'OWNER') return this.owner;
    throw new Error(
      `Account deletion is restricted to OWNER role; received '${role}'. ` +
        'Staff and parents cannot self-delete.',
    );
  }
}
