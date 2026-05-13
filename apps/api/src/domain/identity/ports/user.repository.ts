import type { User } from '../entities/user.entity';
import type { UserRole } from '@academyflo/contracts';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  findByEmail(emailNormalized: string): Promise<User | null>;
  findByPhone(phoneE164: string): Promise<User | null>;
  updateAcademyId(userId: string, academyId: string): Promise<void>;
  /**
   * Paginated list of users in an academy with a given role. The optional
   * `status` filter is honored at the DB layer (not after pagination) so
   * `total` correctly reflects the filtered set. Without `status`, both
   * ACTIVE and INACTIVE users are returned (M4 staff-management audit fix:
   * in-memory filter broke pagination).
   */
  listByAcademyAndRole(
    academyId: string,
    role: UserRole,
    page: number,
    pageSize: number,
    status?: 'ACTIVE' | 'INACTIVE',
  ): Promise<{ users: User[]; total: number }>;
  /**
   * Count of ACTIVE (not deleted, status=ACTIVE) users for the academy+role.
   * Distinct from listByAcademyAndRole's `total` which includes INACTIVE users.
   */
  countActiveByAcademyAndRole(academyId: string, role: UserRole): Promise<number>;
  /**
   * Returns ALL active parent userIds for the academy — no pagination cap.
   * Used by push fan-outs (M1 holidays audit fix) where the caller only
   * needs userIds, not full User records, and where a silent page-size
   * cap would miss parents at large academies. Cheaper than paginating
   * `listByAcademyAndRole` because it projects to `_id` only.
   */
  listParentIdsByAcademy(academyId: string): Promise<string[]>;
  incrementTokenVersionByAcademyId(academyId: string): Promise<string[]>;
  incrementTokenVersionByUserId(userId: string, expectedVersion: number): Promise<boolean>;
  listByAcademyId(academyId: string): Promise<User[]>;
  /**
   * Anonymize PII and mark the user as soft-deleted. Also bumps tokenVersion
   * so any outstanding refresh tokens are invalidated.
   */
  anonymizeAndSoftDelete(params: {
    userId: string;
    anonymizedEmail: string;
    anonymizedPhoneE164: string;
    anonymizedFullName: string;
    deletedBy: string;
  }): Promise<void>;
}
