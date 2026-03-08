import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { PasswordGeneratorPort } from '@application/common/password-generator.port';

@Injectable()
export class CryptoPasswordGenerator implements PasswordGeneratorPort {
  generate(): string {
    return randomBytes(12).toString('base64url');
  }
}
