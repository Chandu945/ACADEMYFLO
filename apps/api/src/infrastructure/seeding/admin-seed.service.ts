import { Injectable, Inject, type OnModuleInit } from '@nestjs/common';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import { PASSWORD_HASHER } from '@application/identity/ports/password-hasher.port';
import { AppConfigService } from '@shared/config/config.service';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { randomUUID } from 'crypto';

/**
 * Placeholder E.164 phone used when seeding the super-admin user, since the
 * User aggregate requires a phone but super-admin is identified by email.
 * Deliberately not a real number; operators can edit the stored value later.
 */
const SEED_ADMIN_PLACEHOLDER_PHONE = '+910000000000';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.superAdminEmail;
    const password = this.config.superAdminPassword;

    const existing = await this.userRepo.findByEmail(email.toLowerCase());

    if (existing) {
      // Password rotation via env is a dev-only convenience. In prod/staging,
      // the env password may differ from the stored hash for legitimate
      // reasons (env rolled back, secret rotated out-of-band, config drift)
      // and silently overwriting the DB would create a backdoor.
      if (!this.config.isDevelopment) {
        this.logger.warn(
          'Super admin exists; password update on env mismatch is disabled outside development',
          { email },
        );
        return;
      }
      const matches = await this.hasher.compare(password, existing.passwordHash);
      if (!matches) {
        const newHash = await this.hasher.hash(password);
        // Use the domain method so tokenVersion is bumped and any outstanding
        // super-admin sessions are invalidated on the next auth check.
        const updated = existing.changePassword(newHash);
        await this.userRepo.save(updated);
        this.logger.info('Super admin password updated (dev seed)');
      }
      return;
    }

    const hash = await this.hasher.hash(password);
    const user = User.create({
      id: randomUUID(),
      fullName: 'Super Admin',
      email,
      phoneNumber: SEED_ADMIN_PLACEHOLDER_PHONE,
      role: 'SUPER_ADMIN',
      passwordHash: hash,
    });
    await this.userRepo.save(user);
    this.logger.info('Super admin user created', { email });
  }
}
