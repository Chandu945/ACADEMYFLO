import { Module } from '@nestjs/common';
import { AuthModule } from '@presentation/http/auth/auth.module';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [AuthModule],
  providers: [AdminSeedService],
})
export class SeedingModule {}
