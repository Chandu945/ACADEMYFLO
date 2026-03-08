/** User roles exactly as per SRS */
export type UserRole = 'OWNER' | 'STAFF' | 'PARENT' | 'SUPER_ADMIN';

export const USER_ROLES: readonly UserRole[] = ['OWNER', 'STAFF', 'PARENT', 'SUPER_ADMIN'] as const;
