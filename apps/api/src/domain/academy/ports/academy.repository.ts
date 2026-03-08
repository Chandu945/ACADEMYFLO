import type { Academy } from '../entities/academy.entity';

export const ACADEMY_REPOSITORY = Symbol('ACADEMY_REPOSITORY');

export interface AcademyRepository {
  save(academy: Academy): Promise<void>;
  findById(id: string): Promise<Academy | null>;
  findByOwnerUserId(ownerUserId: string): Promise<Academy | null>;
  findAllIds(): Promise<string[]>;
}
