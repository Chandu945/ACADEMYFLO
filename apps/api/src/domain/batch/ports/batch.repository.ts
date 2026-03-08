import type { Batch } from '../entities/batch.entity';

export const BATCH_REPOSITORY = Symbol('BATCH_REPOSITORY');

export interface BatchRepository {
  save(batch: Batch): Promise<void>;
  findById(id: string): Promise<Batch | null>;
  findByAcademyAndName(academyId: string, batchNameNormalized: string): Promise<Batch | null>;
  listByAcademy(
    academyId: string,
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<{ batches: Batch[]; total: number }>;
  deleteById(id: string): Promise<void>;
}
