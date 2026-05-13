import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type StaffAttendanceDocument = HydratedDocument<StaffAttendanceModel>;

/**
 * PRESENT-only records: if a record exists for (academyId, staffUserId, date),
 * the staff member is PRESENT. No record means ABSENT.
 *
 * Matches the student-attendance model (no-record = absent). The earlier
 * doc described an ABSENT-only model that never matched the use-case
 * implementation — corrected in the L1 attendance audit fix.
 */
@Schema({
  collection: 'staffAttendance',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class StaffAttendanceModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  staffUserId!: string;

  @Prop({ required: true })
  date!: string; // YYYY-MM-DD

  @Prop({ required: true })
  markedByUserId!: string;

  @Prop({ default: 1 })
  version!: number;
}

export const StaffAttendanceSchema = SchemaFactory.createForClass(StaffAttendanceModel);

// Unique: one present record per (academy, staff, date)
StaffAttendanceSchema.index({ academyId: 1, staffUserId: 1, date: 1 }, { unique: true });

// Query: all present staff for a given day
StaffAttendanceSchema.index({ academyId: 1, date: 1 });
