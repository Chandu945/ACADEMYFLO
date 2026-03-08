import { randomInt } from 'crypto';
import type { OtpGenerator } from '@application/identity/ports/otp-generator.port';

export class CryptoOtpGenerator implements OtpGenerator {
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
