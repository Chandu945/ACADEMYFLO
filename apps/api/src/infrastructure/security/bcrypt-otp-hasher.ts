import { hash, compare } from 'bcryptjs';
import type { OtpHasher } from '@application/identity/ports/otp-hasher.port';

export class BcryptOtpHasher implements OtpHasher {
  private readonly cost = 6;

  async hash(otp: string): Promise<string> {
    return hash(otp, this.cost);
  }

  async compare(otp: string, hashed: string): Promise<boolean> {
    return compare(otp, hashed);
  }
}
