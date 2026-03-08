import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MongoDbModule } from '../../../infrastructure/database/mongodb.module';

@Module({
  imports: [MongoDbModule.register()],
  controllers: [HealthController],
})
export class HealthModule {}
