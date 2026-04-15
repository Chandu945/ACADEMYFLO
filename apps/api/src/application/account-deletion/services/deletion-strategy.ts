import { Inject, Injectable, Logger } from '@nestjs/common';
import type { UserRole } from '@playconnect/contracts';
import type { Result } from '@shared/kernel';
import { AppError, err, ok } from '@shared/kernel';
import type { AccountDeletionRequest } from '@domain/account-deletion/entities/account-deletion-request.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { AcademyTeardownService } from '@infrastructure/services/academy-teardown.service';

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
      const last10 = uid.replace(/[^0-9]/g, '').slice(-10).padStart(10, '0');
      await this.users.anonymizeAndSoftDelete({
        userId: uid,
        anonymizedEmail: `deleted-${uid}@anonymized.local`,
        anonymizedPhoneE164: `+9100${last10}`,
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
