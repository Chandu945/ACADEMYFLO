import type { UserRole } from '@playconnect/contracts';

export interface CurrentUser {
  userId: string;
  email: string;
  role: UserRole;
}
