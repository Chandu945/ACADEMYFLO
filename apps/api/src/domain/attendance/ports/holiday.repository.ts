import type { Holiday } from '../entities/holiday.entity';

export const HOLIDAY_REPOSITORY = Symbol('HOLIDAY_REPOSITORY');

export interface HolidayRepository {
  save(holiday: Holiday): Promise<void>;
  findByAcademyAndDate(academyId: string, date: string): Promise<Holiday | null>;
  deleteByAcademyAndDate(academyId: string, date: string): Promise<void>;
  findByAcademyAndMonth(academyId: string, monthPrefix: string): Promise<Holiday[]>;
}
