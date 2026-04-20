import type { UserRole } from '@academyflo/contracts';

export interface CurrentUser {
  userId: string;
  email: string;
  role: UserRole;
}
