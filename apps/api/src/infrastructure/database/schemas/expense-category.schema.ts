import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategoryModel>;

@Schema({
  collection: 'expense_categories',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class ExpenseCategoryModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  createdBy!: string;
}

export const ExpenseCategorySchema = SchemaFactory.createForClass(ExpenseCategoryModel);

ExpenseCategorySchema.index({ academyId: 1, name: 1 }, { unique: true });
