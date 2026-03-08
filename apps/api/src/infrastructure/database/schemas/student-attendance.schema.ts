import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type StudentAttendanceDocument = HydratedDocument<StudentAttendanceModel>;

/**
 * ABSENT-only records: if no record exists for (academyId, studentId, date),
 * the student is considered PRESENT.
 */
@Schema({
  collection: 'studentAttendance',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class StudentAttendanceModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  studentId!: string;

  @Prop({ required: true })
  date!: string; // YYYY-MM-DD

  @Prop({ required: true })
  markedByUserId!: string;

  @Prop({ default: 1 })
  version!: number;
}

export const StudentAttendanceSchema = SchemaFactory.createForClass(StudentAttendanceModel);

// Unique: one absent record per (academy, student, date)
StudentAttendanceSchema.index({ academyId: 1, studentId: 1, date: 1 }, { unique: true });

// Query: all absences for a given day
StudentAttendanceSchema.index({ academyId: 1, date: 1 });
