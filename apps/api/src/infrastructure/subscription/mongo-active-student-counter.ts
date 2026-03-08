import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { ActiveStudentCounterPort } from '@application/subscription/ports/active-student-counter.port';
import { StudentModel } from '@infrastructure/database/schemas/student.schema';
import type { StudentDocument } from '@infrastructure/database/schemas/student.schema';

@Injectable()
export class MongoActiveStudentCounter implements ActiveStudentCounterPort {
  constructor(@InjectModel(StudentModel.name) private readonly model: Model<StudentDocument>) {}

  async countActiveStudents(academyId: string, asOfDate: Date): Promise<number> {
    return this.model.countDocuments({
      academyId,
      status: 'ACTIVE',
      joiningDate: { $lte: asOfDate },
      deletedAt: null,
    });
  }
}
