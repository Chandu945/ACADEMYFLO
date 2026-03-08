import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserModel>;

@Schema({
  collection: 'users',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class UserModel {
  @Prop({ type: String, required: true })
  _id!: string;
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  emailNormalized!: string;

  @Prop({ required: true, unique: true, trim: true })
  phoneE164!: string;

  @Prop({ required: true, enum: ['OWNER', 'STAFF', 'PARENT', 'SUPER_ADMIN'] })
  role!: string;

  @Prop({ required: true, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: String, default: null })
  academyId!: string | null;

  @Prop({ type: Number, default: 0 })
  tokenVersion!: number;

  // Staff-specific extended fields
  @Prop({ type: String, default: null })
  profilePhotoUrl!: string | null;

  @Prop({ type: Date, default: null })
  startDate!: Date | null;

  @Prop({ type: String, default: null, enum: ['MALE', 'FEMALE', null] })
  gender!: string | null;

  @Prop({ type: String, default: null })
  whatsappNumber!: string | null;

  @Prop({ type: String, default: null })
  mobileNumber!: string | null;

  @Prop({ type: String, default: null })
  address!: string | null;

  @Prop(
    raw({
      qualification: { type: String, default: null },
      position: { type: String, default: null },
    }),
  )
  qualificationInfo!: {
    qualification: string | null;
    position: string | null;
  } | null;

  @Prop(
    raw({
      amount: { type: Number, default: null },
      frequency: { type: String, enum: ['MONTHLY', 'WEEKLY', 'DAILY'], default: 'MONTHLY' },
    }),
  )
  salaryConfig!: {
    amount: number | null;
    frequency: string;
  } | null;

  @Prop({ default: 1 })
  version!: number;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: String, default: null })
  deletedBy!: string | null;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);

// Compound index for admin queries
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ academyId: 1, role: 1 });
