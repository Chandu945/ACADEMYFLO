import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';

export interface LogoutInput {
  userId: string;
  deviceId: string;
}

export class LogoutUseCase {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly deviceTokenRepo: DeviceTokenRepository,
  ) {}

  async execute(input: LogoutInput): Promise<Result<void, AppError>> {
    await this.sessionRepo.revokeByUserAndDevice(input.userId, input.deviceId);
    // DeviceToken rows have no deviceId column, so per-device scoping is not
    // possible without a schema migration — remove all FCM tokens for this
    // user on any logout so push stops flowing to the device that logged out.
    await this.deviceTokenRepo.removeByUserIds([input.userId]);
    return ok(undefined);
  }
}
