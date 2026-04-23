import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type AcademyReviewDocument = HydratedDocument<AcademyReviewModel>;

@Schema({
  collection: 'academy_reviews',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class AcademyReviewModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  parentUserId!: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ type: String, default: null })
  comment!: string | null;

  @Prop({ default: 1 })
  version!: number;
}

export const AcademyReviewSchema = SchemaFactory.createForClass(AcademyReviewModel);

// One review per parent per academy — editable, not stacked.
AcademyReviewSchema.index({ academyId: 1, parentUserId: 1 }, { unique: true });

// List-by-academy ordered by most recent first.
AcademyReviewSchema.index({ academyId: 1, createdAt: -1 });
