import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'events', timestamps: true })
export class EventModel extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  academyId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: String, default: null })
  eventType!: string | null;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ type: Date, default: null })
  endDate!: Date | null;

  @Prop({ type: String, default: null })
  startTime!: string | null;

  @Prop({ type: String, default: null })
  endTime!: string | null;

  @Prop({ default: true })
  isAllDay!: boolean;

  @Prop({ type: String, default: null })
  location!: string | null;

  @Prop({ type: String, default: null })
  targetAudience!: string | null;

  @Prop({ type: [Types.ObjectId], default: [] })
  batchIds!: Types.ObjectId[];

  @Prop({ required: true })
  status!: string;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(EventModel);

EventSchema.index({ academyId: 1, startDate: -1 });
EventSchema.index({ academyId: 1, status: 1, startDate: 1 });
EventSchema.index({ academyId: 1, startDate: 1, endDate: 1 });
