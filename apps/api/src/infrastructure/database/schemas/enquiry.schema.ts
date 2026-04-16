import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type EnquiryDocument = HydratedDocument<EnquiryModel>;

@Schema({ _id: true, timestamps: { createdAt: 'createdAt' } })
class FollowUpSubdocument {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ required: true })
  notes!: string;

  @Prop({ type: Date, default: null })
  nextFollowUpDate!: Date | null;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ type: Date })
  createdAt!: Date;
}

@Schema({
  collection: 'enquiries',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class EnquiryModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  academyId!: string;

  @Prop({ required: true, trim: true })
  prospectName!: string;

  @Prop({ type: String, default: null })
  guardianName!: string | null;

  @Prop({ required: true })
  mobileNumber!: string;

  @Prop({ type: String, default: null })
  whatsappNumber!: string | null;

  @Prop({ type: String, default: null })
  email!: string | null;

  @Prop({ type: String, default: null })
  address!: string | null;

  @Prop({ type: String, default: null })
  interestedIn!: string | null;

  @Prop({ type: String, default: null })
  source!: string | null;

  @Prop({ type: String, default: null })
  notes!: string | null;

  @Prop({ required: true, default: 'ACTIVE' })
  status!: string;

  @Prop({ type: String, default: null })
  closureReason!: string | null;

  @Prop({ type: String, default: null })
  convertedStudentId!: string | null;

  @Prop({ type: String, default: null })
  closedBy!: string | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: Date, default: null })
  nextFollowUpDate!: Date | null;

  @Prop({ type: [FollowUpSubdocument], default: [] })
  followUps!: FollowUpSubdocument[];

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ default: 1 })
  version!: number;
}

export const EnquirySchema = SchemaFactory.createForClass(EnquiryModel);

EnquirySchema.index({ academyId: 1, status: 1, createdAt: -1 });
EnquirySchema.index({ academyId: 1, nextFollowUpDate: 1 });
EnquirySchema.index({ academyId: 1, mobileNumber: 1 });
