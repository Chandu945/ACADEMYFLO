import type { StaffStatus } from '@playconnect/contracts';
export type { StaffStatus } from '@playconnect/contracts';

export type SalaryFrequency = 'MONTHLY' | 'WEEKLY' | 'DAILY';

export type StaffQualificationInfo = {
  qualification: string | null;
  position: string | null;
};

export type StaffSalaryConfig = {
  amount: number | null;
  frequency: SalaryFrequency;
};

export type StaffListItem = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: StaffStatus;
  academyId: string;
  startDate: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  whatsappNumber: string | null;
  mobileNumber: string | null;
  address: string | null;
  qualificationInfo: StaffQualificationInfo | null;
  salaryConfig: StaffSalaryConfig | null;
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffInput = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  startDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  whatsappNumber?: string | null;
  mobileNumber?: string | null;
  address?: string | null;
  qualificationInfo?: StaffQualificationInfo | null;
  salaryConfig?: StaffSalaryConfig | null;
  profilePhotoUrl?: string | null;
};

export type UpdateStaffInput = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  startDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  whatsappNumber?: string | null;
  mobileNumber?: string | null;
  address?: string | null;
  qualificationInfo?: StaffQualificationInfo | null;
  salaryConfig?: StaffSalaryConfig | null;
  profilePhotoUrl?: string | null;
};

export type SetStaffStatusInput = {
  status: StaffStatus;
};
