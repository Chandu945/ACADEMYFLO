import type { Paginated, UserRole } from '@academyflo/contracts';

export const ADMIN_USER_READER = Symbol('ADMIN_USER_READER');

export interface AdminUserRecord {
  id: string;
  fullName: string;
  emailNormalized: string;
  phoneE164: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  academyId: string | null;
  createdAt: Date;
}

export interface AdminUserSearchFilter {
  page: number;
  pageSize: number;
  /** Free-text query — matches name, email, or phone (case-insensitive contains) */
  q?: string;
  role?: UserRole;
  academyId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface AdminUserReader {
  search(filter: AdminUserSearchFilter): Promise<Paginated<AdminUserRecord>>;
}
