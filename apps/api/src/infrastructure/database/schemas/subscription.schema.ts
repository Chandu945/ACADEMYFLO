import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<SubscriptionModel>;

@Schema({
  collection: 'subscriptions',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class SubscriptionModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, unique: true })
  academyId!: string;

  @Prop({ required: true, type: Date })
  trialStartAt!: Date;

  @Prop({ required: true, type: Date })
  trialEndAt!: Date;

  @Prop({ type: Date, default: null })
  paidStartAt!: Date | null;

  @Prop({ type: Date, default: null })
  paidEndAt!: Date | null;

  @Prop({
    type: String,
    enum: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS', null],
    default: null,
  })
  tierKey!: string | null;

  @Prop({
    type: String,
    enum: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS', null],
    default: null,
  })
  pendingTierKey!: string | null;

  @Prop({ type: Date, default: null })
  pendingTierEffectiveAt!: Date | null;

  @Prop({ type: Number, default: null })
  activeStudentCountSnapshot!: number | null;

  @Prop({ type: String, default: null })
  manualNotes!: string | null;

  @Prop({ type: String, default: null })
  paymentReference!: string | null;

  @Prop({ default: 1 })
  version!: number;
}

export const SubscriptionSchema = SchemaFactory.createForClass(SubscriptionModel);

// Index for paid end date queries
SubscriptionSchema.index({ paidEndAt: 1 });
