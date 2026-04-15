export interface RequestAccountDeletionInput {
  userId: string;
  password: string;
  confirmationPhrase: string;
  reason?: string | null;
  requestedFromIp?: string | null;
}

export interface AccountDeletionStatusDto {
  id: string;
  status: 'REQUESTED' | 'CANCELED' | 'COMPLETED';
  requestedAt: string;
  scheduledExecutionAt: string;
  canceledAt: string | null;
  completedAt: string | null;
  reason: string | null;
  role: string;
}
