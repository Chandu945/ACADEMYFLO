import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SessionRepository } from '@domain/identity/ports/session.repository';

export interface LogoutInput {
  userId: string;
  deviceId: string;
}

export class LogoutUseCase {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async execute(input: LogoutInput): Promise<Result<void, AppError>> {
    await this.sessionRepo.revokeByUserAndDevice(input.userId, input.deviceId);
    return ok(undefined);
  }
}
