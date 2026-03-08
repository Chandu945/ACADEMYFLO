import { Schema, model } from 'mongoose';

export interface JobLockDocument {
  _id: string;
  lockedUntil: Date;
  lockedBy: string;
  updatedAt: Date;
}

export const JobLockSchema = new Schema<JobLockDocument>(
  {
    _id: { type: String },
    lockedUntil: { type: Date, required: true },
    lockedBy: { type: String, required: true },
    updatedAt: { type: Date, required: true },
  },
  {
    collection: 'jobLocks',
    _id: false,
    versionKey: false,
  },
);

export const JobLockModelName = 'JobLock';
export const JobLockModel = model<JobLockDocument>(JobLockModelName, JobLockSchema);
