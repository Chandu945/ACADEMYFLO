import type { Enquiry } from '../entities/enquiry.entity';

export const ENQUIRY_REPOSITORY = Symbol('ENQUIRY_REPOSITORY');

export interface EnquiryListFilter {
  academyId: string;
  status?: 'ACTIVE' | 'CLOSED';
  search?: string;
  followUpToday?: boolean;
}

export interface EnquirySummaryResult {
  total: number;
  active: number;
  closed: number;
  todayFollowUp: number;
}

export interface EnquiryRepository {
  save(enquiry: Enquiry): Promise<void>;
  /**
   * Optimistic-concurrency save: persist only if the stored version equals
   * `expectedVersion`. Returns true on success, false on version mismatch.
   * Mutations (close, follow-up, update, convert) should use this to prevent
   * lost updates under concurrent edits.
   */
  saveWithVersionPrecondition(enquiry: Enquiry, expectedVersion: number): Promise<boolean>;
  findById(id: string): Promise<Enquiry | null>;
  findActiveByMobileAndAcademy(academyId: string, mobileNumber: string): Promise<Enquiry | null>;
  list(filter: EnquiryListFilter, page: number, pageSize: number): Promise<{ enquiries: Enquiry[]; total: number }>;
  summary(academyId: string): Promise<EnquirySummaryResult>;
}
