import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Academy } from '@domain/academy/entities/academy.entity';
import type { Address } from '@domain/academy/entities/academy.entity';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canSetupAcademy } from '@domain/academy/rules/academy.rules';
import type { UserRole } from '@academyflo/contracts';
import type { CreateTrialSubscriptionUseCase } from '../../subscription/use-cases/create-trial-subscription.usecase';
import type { TransactionPort } from '../../common/transaction.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { UserAuthCachePort } from '../../identity/ports/user-auth-cache.port';
import { AuthErrors } from '../../common/errors';
import { randomUUID } from 'crypto';

export interface SetupAcademyInput {
  ownerUserId: string;
  ownerRole: UserRole;
  academyName: string;
  address: Address;
}

export interface SetupAcademyOutput {
  id: string;
  academyName: string;
  address: Address;
}

export class SetupAcademyUseCase {
  constructor(
    private readonly academyRepo: AcademyRepository,
    private readonly userRepo: UserRepository,
    private readonly createTrial: CreateTrialSubscriptionUseCase,
    private readonly transaction: TransactionPort,
    /**
     * M3 academy-onboarding fix: records ACADEMY_CREATED at the moment of
     * setup. Optional so legacy fixtures keep working.
     */
    private readonly auditRecorder?: AuditRecorderPort,
    /**
     * M1 academy-onboarding fix: bust the owner's auth cache after their
     * academyId is linked. Without this, the cached user row keeps
     * reporting academyId=null until the 5-min TTL — which combines badly
     * with the JWT carrying a null academyId in its payload.
     */
    private readonly userAuthCache?: UserAuthCachePort,
  ) {}

  async execute(input: SetupAcademyInput): Promise<Result<SetupAcademyOutput, AppError>> {
    const roleCheck = canSetupAcademy(input.ownerRole);
    if (!roleCheck.allowed) {
      return err(AuthErrors.notOwner());
    }

    const existing = await this.academyRepo.findByOwnerUserId(input.ownerUserId);
    if (existing) {
      return err(AuthErrors.academyAlreadyExists());
    }

    // M1 fix: load the owner so we can pass the expected tokenVersion to the
    // CAS-style increment inside the transaction. If we tried to increment
    // without the expected version we'd need a separate atomic-increment
    // primitive — the existing port already encodes CAS semantics.
    const owner = await this.userRepo.findById(input.ownerUserId);
    if (!owner) {
      return err(AuthErrors.notOwner());
    }
    const expectedTokenVersion = owner.tokenVersion;

    const academyId = randomUUID();
    const academy = Academy.create({
      id: academyId,
      ownerUserId: input.ownerUserId,
      academyName: input.academyName,
      address: input.address,
    });

    // Atomic: academy save + owner link + trial subscription creation + the
    // tokenVersion bump on the owner all succeed together or all roll back.
    // The bump is critical (M1): the owner's existing JWT has academyId=null
    // in its payload, and JwtAuthGuard reads request.user from payload. After
    // setup, the owner needs a fresh token to access any academy-scoped
    // endpoint. Bumping tokenVersion forces the next request to fail with
    // mismatch → the client refreshes → fresh token carries the new
    // academyId. Each write is individually idempotent so the transaction's
    // auto-retry on TransientTransactionError stays safe.
    try {
      await this.transaction.run(async () => {
        await this.academyRepo.save(academy);
        await this.userRepo.updateAcademyId(input.ownerUserId, academyId);
        // M1: bump tokenVersion so the owner is forced through refresh on
        // their very next request. Without this they'd hit
        // /students POST etc. with a null-academyId payload until they
        // manually re-auth. CAS-style increment so a concurrent
        // refresh/login that also bumped tokenVersion doesn't get clobbered.
        await this.userRepo.incrementTokenVersionByUserId(input.ownerUserId, expectedTokenVersion);
        await this.createTrial.execute(academyId);
      });
    } catch (e) {
      // M2 academy-onboarding fix: map the unique-index collision (a second
      // concurrent setup landing after the read-side check passed) to a
      // typed conflict instead of a generic 500. Mongoose's E11000 error
      // shape exposes a numeric `code` field.
      if ((e as { code?: number })?.code === 11000) {
        return err(AuthErrors.academyAlreadyExists());
      }
      throw e;
    }

    // Post-commit side-effects. The auth cache invalidation MUST happen
    // here (not inside the transaction) — the cache is external state, no
    // transaction can roll it back, and we only want to bust it after the
    // tokenVersion bump is durably committed. M1 fix.
    await this.userAuthCache?.invalidate(input.ownerUserId);

    // M3 academy-onboarding fix: ACADEMY_CREATED in the audit feed so a
    // super-admin can answer "when was this academy onboarded and by whom".
    if (this.auditRecorder) {
      await this.auditRecorder
        .record({
          academyId,
          actorUserId: input.ownerUserId,
          action: 'ACADEMY_CREATED',
          entityType: 'ACADEMY',
          entityId: academyId,
          context: { academyName: academy.academyName },
        })
        .catch(() => {});
    }

    return ok({
      id: academy.id.toString(),
      academyName: academy.academyName,
      address: academy.address,
    });
  }
}
