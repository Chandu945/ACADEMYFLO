import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';

export interface LogoutAllInput {
  userId: string;
}

export class LogoutAllUseCase {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly deviceTokenRepo: DeviceTokenRepository,
  ) {}

  async execute(input: LogoutAllInput): Promise<Result<void, AppError>> {
    await this.sessionRepo.revokeAllByUserIds([input.userId]);
    await this.deviceTokenRepo.removeByUserIds([input.userId]);
    return ok(undefined);
  }
}
