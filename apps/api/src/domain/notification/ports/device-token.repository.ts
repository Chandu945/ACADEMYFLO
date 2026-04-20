export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');

export interface DeviceToken {
  id: string;
  userId: string;
  fcmToken: string;
  platform: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceTokenRepository {
  upsert(userId: string, fcmToken: string, platform: string): Promise<void>;
  removeByUserIdAndToken(userId: string, fcmToken: string): Promise<void>;
  /**
   * Remove every FCM token registered by the given users. Called on any
   * session-ending event (logout-all, password reset, admin force-logout,
   * admin reset owner password) so push notifications stop flowing to
   * devices whose user session was just invalidated.
   * Returns the number of tokens removed (for logging / audit context).
   */
  removeByUserIds(userIds: string[]): Promise<number>;
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findByUserIds(userIds: string[]): Promise<DeviceToken[]>;
}
