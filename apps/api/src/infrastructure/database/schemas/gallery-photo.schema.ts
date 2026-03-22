import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'gallery_photos', timestamps: true })
export class GalleryPhotoModel extends Document {
  @Prop({ type: String, required: true, index: true })
  eventId!: string;

  @Prop({ type: String, required: true, index: true })
  academyId!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ type: String, default: null })
  thumbnailUrl!: string | null;

  @Prop({ type: String, default: null })
  caption!: string | null;

  @Prop({ type: String, required: true })
  uploadedBy!: string;

  @Prop({ type: String, default: null })
  uploadedByName!: string | null;
}

export const GalleryPhotoSchema = SchemaFactory.createForClass(GalleryPhotoModel);

GalleryPhotoSchema.index({ eventId: 1, createdAt: -1 });
