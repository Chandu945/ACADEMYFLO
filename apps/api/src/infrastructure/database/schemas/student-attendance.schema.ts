import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type StudentAttendanceDocument = HydratedDocument<StudentAttendanceModel>;

/**
 * PRESENT-only records keyed by (academy, student, batch, date).
 * No record = the student was absent from that batch's session on that date.
 * A two-session student in morning + evening batches has up to two records/day.
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
  batchId!: string;

  @Prop({ required: true })
  date!: string; // YYYY-MM-DD

  @Prop({ required: true })
  markedByUserId!: string;

  @Prop({ default: 1 })
  version!: number;
}

export const StudentAttendanceSchema = SchemaFactory.createForClass(StudentAttendanceModel);

// One present record per (academy, student, batch, date).
StudentAttendanceSchema.index(
  { academyId: 1, studentId: 1, batchId: 1, date: 1 },
  { unique: true },
);

// Day-level queries (e.g. "all present today" across batches).
StudentAttendanceSchema.index({ academyId: 1, date: 1 });

// Per-batch day queries (the marking screen filtered by batch).
StudentAttendanceSchema.index({ academyId: 1, batchId: 1, date: 1 });
