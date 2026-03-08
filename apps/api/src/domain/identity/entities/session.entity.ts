import { Entity, UniqueId } from '@shared/kernel';

export interface SessionProps {
  userId: string;
  deviceId: string;
  refreshTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  lastRotatedAt: Date | null;
}

export class Session extends Entity<SessionProps> {
  private constructor(id: UniqueId, props: SessionProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    userId: string;
    deviceId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Session {
    return new Session(new UniqueId(params.id), {
      userId: params.userId,
      deviceId: params.deviceId,
      refreshTokenHash: params.refreshTokenHash,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      revokedAt: null,
      lastRotatedAt: null,
    });
  }

  static reconstitute(id: string, props: SessionProps): Session {
    return new Session(new UniqueId(id), props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get deviceId(): string {
    return this.props.deviceId;
  }

  get refreshTokenHash(): string {
    return this.props.refreshTokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isValid(): boolean {
    return !this.isRevoked() && !this.isExpired();
  }
}
