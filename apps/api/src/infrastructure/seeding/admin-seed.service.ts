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
      // Update password if changed
      const matches = await this.hasher.compare(password, existing.passwordHash);
      if (!matches) {
        const newHash = await this.hasher.hash(password);
        const updated = User.reconstitute(existing.id.toString(), {
          ...existing['props'],
          passwordHash: newHash,
        });
        await this.userRepo.save(updated);
        this.logger.info('Super admin password updated');
      }
      return;
    }

    const hash = await this.hasher.hash(password);
    const user = User.create({
      id: randomUUID(),
      fullName: 'Super Admin',
      email,
      phoneNumber: '+910000000000',
      role: 'SUPER_ADMIN',
      passwordHash: hash,
    });
    await this.userRepo.save(user);
    this.logger.info('Super admin user created', { email });
  }
}
