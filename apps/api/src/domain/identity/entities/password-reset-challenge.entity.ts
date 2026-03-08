import { Entity, UniqueId } from '@shared/kernel';

export interface PasswordResetChallengeProps {
  userId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  usedAt: Date | null;
  createdAt: Date;
}

export class PasswordResetChallenge extends Entity<PasswordResetChallengeProps> {
  private constructor(id: UniqueId, props: PasswordResetChallengeProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    userId: string;
    otpHash: string;
    expiresAt: Date;
    maxAttempts: number;
  }): PasswordResetChallenge {
    return new PasswordResetChallenge(new UniqueId(params.id), {
      userId: params.userId,
      otpHash: params.otpHash,
      expiresAt: params.expiresAt,
      attempts: 0,
      maxAttempts: params.maxAttempts,
      usedAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: PasswordResetChallengeProps): PasswordResetChallenge {
    return new PasswordResetChallenge(new UniqueId(id), props);
  }

  isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  hasExceededAttempts(): boolean {
    return this.props.attempts >= this.props.maxAttempts;
  }

  canVerify(): boolean {
    return !this.isExpired() && !this.isUsed() && !this.hasExceededAttempts();
  }

  get userId(): string {
    return this.props.userId;
  }

  get otpHash(): string {
    return this.props.otpHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get maxAttempts(): number {
    return this.props.maxAttempts;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
