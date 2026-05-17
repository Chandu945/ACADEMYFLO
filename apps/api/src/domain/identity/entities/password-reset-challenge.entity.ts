import { Entity, UniqueId } from '@shared/kernel';

export interface PasswordResetChallengeProps {
  userId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  usedAt: Date | null;
  verifiedAt: Date | null;
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
      verifiedAt: null,
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

  isVerified(): boolean {
    return this.props.verifiedAt !== null;
  }

  // Verification stays valid for `ttlMs` after it was granted. Confirm uses
  // this to skip a second attempts-increment on the happy path while still
  // forcing a fresh verify if the user idled on the password screen.
  isVerificationFresh(ttlMs: number): boolean {
    if (this.props.verifiedAt === null) return false;
    return Date.now() - this.props.verifiedAt.getTime() <= ttlMs;
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

  get verifiedAt(): Date | null {
    return this.props.verifiedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
