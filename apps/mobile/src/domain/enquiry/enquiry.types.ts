export type EnquirySource = 'WALK_IN' | 'PHONE' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'WEBSITE' | 'OTHER';
export type EnquiryStatus = 'ACTIVE' | 'CLOSED';
export type ClosureReason = 'CONVERTED' | 'NOT_INTERESTED' | 'OTHER';

export type FollowUp = {
  id: string;
  date: string;
  notes: string;
  nextFollowUpDate: string | null;
  createdBy: string;
  createdAt: string;
};

export type EnquiryListItem = {
  id: string;
  prospectName: string;
  mobileNumber: string;
  interestedIn: string | null;
  source: string | null;
  status: EnquiryStatus;
  nextFollowUpDate: string | null;
  followUpCount: number;
  createdAt: string;
};

export type EnquiryDetail = {
  id: string;
  prospectName: string;
  guardianName: string | null;
  mobileNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  interestedIn: string | null;
  source: string | null;
  notes: string | null;
  status: EnquiryStatus;
  closureReason: string | null;
  convertedStudentId: string | null;
  nextFollowUpDate: string | null;
  followUps: FollowUp[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnquirySummary = {
  total: number;
  active: number;
  closed: number;
  todayFollowUp: number;
};

export type CreateEnquiryRequest = {
  prospectName: string;
  guardianName?: string;
  mobileNumber: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  interestedIn?: string;
  source?: EnquirySource;
  notes?: string;
  nextFollowUpDate?: string;
};

export type UpdateEnquiryRequest = {
  prospectName?: string;
  guardianName?: string | null;
  mobileNumber?: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  interestedIn?: string | null;
  source?: EnquirySource | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
};

export type AddFollowUpRequest = {
  date: string;
  notes: string;
  nextFollowUpDate?: string;
};

export type CloseEnquiryRequest = {
  closureReason: ClosureReason;
  convertedStudentId?: string;
};

export type ConvertToStudentRequest = {
  joiningDate: string;
  monthlyFee: number;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
};

export type ConvertToStudentResponse = {
  enquiry: EnquiryDetail;
  studentId: string;
};

export type EnquiryListQuery = {
  status?: EnquiryStatus;
  search?: string;
  followUpToday?: boolean;
  page: number;
  limit: number;
};
