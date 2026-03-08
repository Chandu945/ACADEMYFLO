import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobLockModelName, JobLockSchema } from './job-lock.schema';
import { MongoJobLockRepository } from './mongo-job-lock.repository';
import { JobLockService } from './job-lock.service';
import { JOB_LOCK_PORT } from '@application/common/ports/job-lock.port';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: JobLockModelName, schema: JobLockSchema }]),
  ],
  providers: [
    MongoJobLockRepository,
    {
      provide: JOB_LOCK_PORT,
      useClass: JobLockService,
    },
  ],
  exports: [JOB_LOCK_PORT],
})
export class JobLockModule {}
