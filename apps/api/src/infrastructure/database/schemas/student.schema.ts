import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type StudentDocument = HydratedDocument<StudentModel>;

@Schema({
  collection: 'students',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class StudentModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  fullNameNormalized!: string;

  @Prop({ required: true, type: Date })
  dateOfBirth!: Date;

  @Prop({ required: true })
  gender!: string;

  @Prop(
    raw({
      line1: { type: String, required: true },
      line2: { type: String, default: null },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    }),
  )
  address!: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };

  @Prop(
    raw({
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      email: { type: String, required: true },
    }),
  )
  guardian!: {
    name: string;
    mobile: string;
    email: string;
  };

  @Prop({ required: true, type: Date })
  joiningDate!: Date;

  @Prop({ required: true })
  monthlyFee!: number;

  @Prop({ type: String, default: null })
  mobileNumber!: string | null;

  @Prop({ type: String, default: null })
  email!: string | null;

  @Prop({ type: String, default: null })
  profilePhotoUrl!: string | null;

  @Prop({ type: String, default: null })
  fatherName!: string | null;

  @Prop({ type: String, default: null })
  motherName!: string | null;

  @Prop({ type: String, default: null })
  aadhaarNumber!: string | null;

  @Prop({ type: String, default: null })
  caste!: string | null;

  @Prop({ type: String, default: null })
  whatsappNumber!: string | null;

  @Prop({ type: String, default: null })
  addressText!: string | null;

  @Prop(
    raw({
      schoolName: { type: String, default: null },
      rollNumber: { type: String, default: null },
      standard: { type: String, default: null },
    }),
  )
  instituteInfo!: {
    schoolName: string | null;
    rollNumber: string | null;
    standard: string | null;
  } | null;

  @Prop({ type: String, default: null })
  passwordHash!: string | null;

  @Prop({ required: true, default: 'ACTIVE' })
  status!: string;

  @Prop({ type: Date, default: null })
  statusChangedAt!: Date | null;

  @Prop({ type: String, default: null })
  statusChangedBy!: string | null;

  @Prop({
    type: [{
      fromStatus: { type: String, required: true },
      toStatus: { type: String, required: true },
      changedBy: { type: String, required: true },
      changedAt: { type: Date, required: true },
      reason: { type: String, default: null },
    }],
    default: [],
  })
  statusHistory!: {
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changedAt: Date;
    reason: string | null;
  }[];

  @Prop({ default: 1 })
  version!: number;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: String, default: null })
  deletedBy!: string | null;
}

export const StudentSchema = SchemaFactory.createForClass(StudentModel);

// Listing: filter by academy + status, sort by createdAt desc
StudentSchema.index({ academyId: 1, status: 1, createdAt: -1 });

// Listing: filter by academy + status, sort by joiningDate asc
StudentSchema.index({ academyId: 1, status: 1, joiningDate: 1 });

// Search: prefix search on normalized name within an academy
StudentSchema.index({ academyId: 1, fullNameNormalized: 1 });
