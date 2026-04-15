import type { AccountDeletionRequest } from '../entities/account-deletion-request.entity';

export const ACCOUNT_DELETION_REQUEST_REPOSITORY = Symbol('ACCOUNT_DELETION_REQUEST_REPOSITORY');

export interface AccountDeletionRequestRepository {
  save(request: AccountDeletionRequest): Promise<void>;
  findById(id: string): Promise<AccountDeletionRequest | null>;
  findPendingByUserId(userId: string): Promise<AccountDeletionRequest | null>;
  findByCancelToken(token: string): Promise<AccountDeletionRequest | null>;
  listDue(now: Date, limit: number): Promise<AccountDeletionRequest[]>;
}
