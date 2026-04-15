import { apiDelete, apiGet, apiPost } from '../http/api-client';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';

export interface AccountDeletionStatus {
  id: string;
  status: 'REQUESTED' | 'CANCELED' | 'COMPLETED';
  requestedAt: string;
  scheduledExecutionAt: string;
  reason: string | null;
  role: string;
}

export interface RequestDeletionInput {
  password: string;
  confirmationPhrase: string;
  reason?: string | null;
}

export function getDeletionStatus(): Promise<Result<AccountDeletionStatus | null, AppError>> {
  return apiGet<AccountDeletionStatus | null>('/api/v1/account/deletion/status');
}

export function requestDeletion(
  input: RequestDeletionInput,
): Promise<Result<AccountDeletionStatus, AppError>> {
  return apiPost<AccountDeletionStatus>('/api/v1/account/deletion', input);
}

export function cancelDeletion(): Promise<Result<void, AppError>> {
  return apiDelete<void>('/api/v1/account/deletion');
}
