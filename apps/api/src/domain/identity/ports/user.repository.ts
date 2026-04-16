import type { User } from '../entities/user.entity';
import type { UserRole } from '@playconnect/contracts';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  findByEmail(emailNormalized: string): Promise<User | null>;
  findByPhone(phoneE164: string): Promise<User | null>;
  updateAcademyId(userId: string, academyId: string): Promise<void>;
  listByAcademyAndRole(
    academyId: string,
    role: UserRole,
    page: number,
    pageSize: number,
  ): Promise<{ users: User[]; total: number }>;
  /**
   * Count of ACTIVE (not deleted, status=ACTIVE) users for the academy+role.
   * Distinct from listByAcademyAndRole's `total` which includes INACTIVE users.
   */
  countActiveByAcademyAndRole(academyId: string, role: UserRole): Promise<number>;
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
