import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type StudentAttendanceDocument = HydratedDocument<StudentAttendanceModel>;

/**
 * Attendance records keyed by (academy, student, batch, date).
 *
 * Stores PRESENT or ABSENT explicitly. Pre-default-present-model rows had
 * no `status` field — Mongoose backfills them to `'PRESENT'` via the default
 * below so historical data reads unchanged. "No record" still means
 * "unmarked" (neither marked PRESENT nor explicitly marked ABSENT) — the
 * dashboard's default-present logic treats unmarked + scheduled-today as
 * present until someone explicitly marks them ABSENT.
 *
 * A two-session student in morning + evening batches has up to two records
 * per day, one per batch.
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

  // Default 'PRESENT' so all pre-existing rows (written before ABSENT was
  // explicitly stored) read as PRESENT — preserves the meaning of every
  // historical row without a migration. New ABSENT marks write 'ABSENT'.
  @Prop({ required: true, enum: ['PRESENT', 'ABSENT'], default: 'PRESENT' })
  status!: 'PRESENT' | 'ABSENT';

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
