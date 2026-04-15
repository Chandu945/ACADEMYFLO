import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type AccountDeletionRequestDocument = HydratedDocument<AccountDeletionRequestModel>;

@Schema({
  collection: 'account_deletion_requests',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class AccountDeletionRequestModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  role!: string;

  @Prop({ type: String, default: null })
  academyId!: string | null;

  @Prop({ required: true, default: 'REQUESTED', index: true })
  status!: string;

  @Prop({ type: String, default: null })
  reason!: string | null;

  @Prop({ type: Date, required: true })
  requestedAt!: Date;

  @Prop({ type: Date, required: true, index: true })
  scheduledExecutionAt!: Date;

  @Prop({ type: Date, default: null })
  canceledAt!: Date | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ required: true, unique: true, index: true })
  cancelToken!: string;

  @Prop({ type: String, default: null })
  requestedFromIp!: string | null;

  @Prop({ default: 1 })
  version!: number;
}

export const AccountDeletionRequestSchema = SchemaFactory.createForClass(AccountDeletionRequestModel);

AccountDeletionRequestSchema.index({ userId: 1, status: 1 });
AccountDeletionRequestSchema.index({ status: 1, scheduledExecutionAt: 1 });
