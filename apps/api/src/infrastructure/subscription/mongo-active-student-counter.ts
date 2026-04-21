import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { ActiveStudentCounterPort } from '@application/subscription/ports/active-student-counter.port';
import { StudentModel } from '@infrastructure/database/schemas/student.schema';
import type { StudentDocument } from '@infrastructure/database/schemas/student.schema';

@Injectable()
export class MongoActiveStudentCounter implements ActiveStudentCounterPort {
  constructor(@InjectModel(StudentModel.name) private readonly model: Model<StudentDocument>) {}

  async countActiveStudents(academyId: string, _asOfDate: Date): Promise<number> {
    // Count every non-deleted ACTIVE student on the roster, regardless of
    // joiningDate. Future-dated joins still consume a seat for billing — an
    // owner who pre-registers 10 students "joining next month" is already
    // committing them to the tier, not deferring capacity.
    return this.model.countDocuments({
      academyId,
      status: 'ACTIVE',
      deletedAt: null,
    });
  }

  async countEligibleStudents(
    academyId: string,
    asOfDate: Date,
    gracePeriodMs: number,
  ): Promise<number> {
    // Same roster semantics as countActiveStudents, with an additional 24h
    // window on createdAt so transient typo-and-delete operations don't push
    // the billing peak.
    const cutoff = new Date(asOfDate.getTime() - gracePeriodMs);
    return this.model.countDocuments({
      academyId,
      status: 'ACTIVE',
      createdAt: { $lte: cutoff },
      deletedAt: null,
    });
  }
}
