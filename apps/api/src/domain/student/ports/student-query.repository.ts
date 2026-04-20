import type { FeeFilter, Gender, StudentStatus } from '@academyflo/contracts';

export const STUDENT_QUERY_REPOSITORY = Symbol('STUDENT_QUERY_REPOSITORY');

export interface StudentListQuery {
  academyId: string;
  status?: StudentStatus;
  search?: string;
  feeFilter?: FeeFilter;
  month?: string;
  studentIds?: string[];
}

export interface StudentListRow {
  id: string;
  academyId: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  guardian: {
    name: string;
    mobile: string;
    email: string;
  } | null;
  joiningDate: string;
  monthlyFee: number;
  mobileNumber: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
  fatherName: string | null;
  motherName: string | null;
  whatsappNumber: string | null;
  addressText: string | null;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentQueryRepository {
  listWithFeeFilter(
    query: StudentListQuery,
    page: number,
    pageSize: number,
  ): Promise<{ rows: StudentListRow[]; total: number }>;
}
