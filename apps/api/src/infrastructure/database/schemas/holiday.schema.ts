import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type HolidayDocument = HydratedDocument<HolidayModel>;

@Schema({
  collection: 'holidays',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class HolidayModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  date!: string; // YYYY-MM-DD

  @Prop({ type: String, default: null })
  reason!: string | null;

  @Prop({ required: true })
  declaredByUserId!: string;

  @Prop({ default: 1 })
  version!: number;
}

export const HolidaySchema = SchemaFactory.createForClass(HolidayModel);

// Unique: one holiday per (academy, date)
HolidaySchema.index({ academyId: 1, date: 1 }, { unique: true });
