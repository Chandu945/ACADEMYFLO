import type { Academy } from '../entities/academy.entity';

export const ACADEMY_REPOSITORY = Symbol('ACADEMY_REPOSITORY');

export interface AcademyRepository {
  save(academy: Academy): Promise<void>;
  /** Optimistic-concurrency save (M5 academy-onboarding audit). Writes only
   *  when the persisted `version` matches `loadedVersion`; returns false on
   *  mismatch so the use case can surface a typed CONFLICT. Use for any
   *  field-level edit (institute info, settings) where two concurrent
   *  owner sessions could otherwise silently overwrite each other. */
  saveWithVersionPrecondition(academy: Academy, loadedVersion: number): Promise<boolean>;
  findById(id: string): Promise<Academy | null>;
  findByOwnerUserId(ownerUserId: string): Promise<Academy | null>;
  findAllIds(): Promise<string[]>;
}
