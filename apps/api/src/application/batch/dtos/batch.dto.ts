import type { Weekday } from '@academyflo/contracts';
import type { Batch, BatchStatus } from '@domain/batch/entities/batch.entity';

export interface BatchDto {
  id: string;
  academyId: string;
  batchName: string;
  days: Weekday[];
  notes: string | null;
  profilePhotoUrl: string | null;
  startTime: string | null;
  endTime: string | null;
  maxStudents: number | null;
  status: BatchStatus;
  // ISO 8601 wire format. Declared `string` here (not `Date`) because JSON
  // serialization always produces an ISO string and mobile zod parses it as
  // a string. Construction site below calls .toISOString() at the boundary.
  createdAt: string;
  updatedAt: string;
}

export function toBatchDto(batch: Batch): BatchDto {
  return {
    id: batch.id.toString(),
    academyId: batch.academyId,
    batchName: batch.batchName,
    days: batch.days,
    notes: batch.notes,
    profilePhotoUrl: batch.profilePhotoUrl,
    startTime: batch.startTime,
    endTime: batch.endTime,
    maxStudents: batch.maxStudents,
    status: batch.status,
    createdAt: batch.audit.createdAt.toISOString(),
    updatedAt: batch.audit.updatedAt.toISOString(),
  };
}
