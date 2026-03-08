import { Injectable } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import { AppConfigService } from '@shared/config/config.service';

/**
 * Bcrypt-based password hasher.
 * Cost factor is configurable via BCRYPT_COST env var (default: 12).
 */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly cost: number;

  constructor(config: AppConfigService) {
    this.cost = config.bcryptCost;
  }

  async hash(plain: string): Promise<string> {
    return hash(plain, this.cost);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
