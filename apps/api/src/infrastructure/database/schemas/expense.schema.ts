import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type ExpenseDocument = HydratedDocument<ExpenseModel>;

@Schema({
  collection: 'expenses',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class ExpenseModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  date!: string;

  @Prop({ type: String, default: null })
  categoryId!: string | null;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ type: String, default: null })
  notes!: string | null;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: String, default: null })
  deletedBy!: string | null;

  @Prop({ default: 1 })
  version!: number;
}

export const ExpenseSchema = SchemaFactory.createForClass(ExpenseModel);

ExpenseSchema.index({ academyId: 1, date: -1 });
ExpenseSchema.index({ academyId: 1, deletedAt: 1 });
ExpenseSchema.index({ academyId: 1, categoryId: 1, date: -1 });
