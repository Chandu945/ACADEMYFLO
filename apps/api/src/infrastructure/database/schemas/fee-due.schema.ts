import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type FeeDueDocument = HydratedDocument<FeeDueModel>;

@Schema({
  collection: 'fee_dues',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class FeeDueModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  studentId!: string;

  @Prop({ required: true })
  monthKey!: string;

  // Strict ISO 8601 short date format: YYYY-MM-DD (zero-padded).
  // Range queries like $lte in findOverdueDues rely on lexicographic order,
  // which only holds when every document uses this canonical format.
  @Prop({ required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  dueDate!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 'UPCOMING', enum: ['UPCOMING', 'DUE', 'PAID'] })
  status!: string;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  @Prop({ type: String, default: null })
  paidByUserId!: string | null;

  @Prop({ type: String, default: null })
  paidSource!: string | null;

  @Prop({ type: String, default: null })
  paymentLabel!: string | null;

  @Prop({ type: String, default: null })
  collectedByUserId!: string | null;

  @Prop({ type: String, default: null })
  approvedByUserId!: string | null;

  @Prop({ type: String, default: null })
  paymentRequestId!: string | null;

  @Prop({ type: Number, default: null })
  lateFeeApplied!: number | null;

  @Prop({ type: Object, default: null })
  lateFeeConfigSnapshot!: {
    lateFeeEnabled: boolean;
    gracePeriodDays: number;
    lateFeeAmountInr: number;
    lateFeeRepeatIntervalDays: number;
  } | null;

  @Prop({ default: 1 })
  version!: number;
}

export const FeeDueSchema = SchemaFactory.createForClass(FeeDueModel);

FeeDueSchema.index({ academyId: 1, studentId: 1, monthKey: 1 }, { unique: true });
FeeDueSchema.index({ academyId: 1, monthKey: 1, status: 1 });
FeeDueSchema.index({ dueDate: 1, status: 1 });

// Partial sparse index for the late-fee snapshot legacy-backfill scan
// (`findDueWithoutSnapshot` in MongoFeeDueRepository).
//
// Before this index, that query had no good index match: Mongo would use
// `{academyId, monthKey, status}` to fetch ALL records for the academy
// across all months, then filter `status: 'DUE'` and
// `lateFeeConfigSnapshot: null` in memory. That scan cost grows linearly
// with the size of the `fee_dues` collection and was the dominant cost of
// the monthly-dues cron at scale.
//
// The partial filter restricts this index to exactly the records the
// query is looking for — DUE fees that still need a snapshot. As fees
// get snapshotted (by M1's flip-time path or the backfill itself), they
// fall out of the index automatically. So the index size stays
// proportional to the work that's actually left to do, not the size of
// the collection.
FeeDueSchema.index(
  { academyId: 1, dueDate: 1 },
  {
    partialFilterExpression: {
      status: 'DUE',
      lateFeeConfigSnapshot: null,
    },
  },
);
