import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type StudentBatchDocument = HydratedDocument<StudentBatchModel>;

@Schema({
  collection: 'student_batches',
  timestamps: false,
  _id: false,
})
export class StudentBatchModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  studentId!: string;

  @Prop({ required: true })
  batchId!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true, type: Date })
  assignedAt!: Date;
}

export const StudentBatchSchema = SchemaFactory.createForClass(StudentBatchModel);

// Fast lookup by student
StudentBatchSchema.index({ studentId: 1 });

// Fast lookup by batch
StudentBatchSchema.index({ batchId: 1 });

// Unique constraint: a student can only be assigned to a batch once
StudentBatchSchema.index({ studentId: 1, batchId: 1 }, { unique: true });
