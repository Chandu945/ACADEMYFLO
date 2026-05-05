import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type TransactionLogDocument = HydratedDocument<TransactionLogModel>;

@Schema({
  collection: 'transaction_logs',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class TransactionLogModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  feeDueId!: string;

  @Prop({ type: String, default: null })
  paymentRequestId!: string | null;

  @Prop({ required: true })
  studentId!: string;

  @Prop({ required: true })
  source!: string;

  @Prop({ required: true })
  monthKey!: string;

  @Prop({ required: true })
  amount!: number;

  // Optional principal / late-fee split. Null on rows created before the
  // split was introduced; together they sum to `amount` for new rows.
  // Readers fall back to the linked FeeDue's `amount`/`lateFeeApplied` when
  // null, so old rows still render reconcilably.
  @Prop({ type: Number, default: null })
  baseAmount!: number | null;

  @Prop({ type: Number, default: null })
  lateFeeAmount!: number | null;

  @Prop({ required: true })
  collectedByUserId!: string;

  @Prop({ required: true })
  approvedByUserId!: string;

  @Prop({ required: true })
  receiptNumber!: string;

  @Prop({ default: 1 })
  version!: number;
}

export const TransactionLogSchema = SchemaFactory.createForClass(TransactionLogModel);

TransactionLogSchema.index({ academyId: 1, createdAt: -1 });
TransactionLogSchema.index({ paymentRequestId: 1 }, { unique: true, sparse: true });
TransactionLogSchema.index({ academyId: 1, receiptNumber: 1 }, { unique: true });
TransactionLogSchema.index({ academyId: 1, source: 1, createdAt: -1 });
TransactionLogSchema.index({ academyId: 1, monthKey: 1 });
