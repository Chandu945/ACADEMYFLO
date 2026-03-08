import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type PasswordResetChallengeDocument = HydratedDocument<PasswordResetChallengeModel>;

@Schema({
  collection: 'password_reset_challenges',
  timestamps: false,
  _id: false,
})
export class PasswordResetChallengeModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  otpHash!: string;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  @Prop({ required: true, default: 0 })
  attempts!: number;

  @Prop({ required: true })
  maxAttempts!: number;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  @Prop({ required: true, type: Date })
  createdAt!: Date;
}

export const PasswordResetChallengeSchema = SchemaFactory.createForClass(
  PasswordResetChallengeModel,
);

PasswordResetChallengeSchema.index({ userId: 1, createdAt: -1 });
PasswordResetChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
