export const ENQUIRY_STATUSES = ['ACTIVE', 'CLOSED'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_SOURCES = ['WALK_IN', 'PHONE', 'REFERRAL', 'SOCIAL_MEDIA', 'WEBSITE', 'OTHER'] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const CLOSURE_REASONS = ['CONVERTED', 'NOT_INTERESTED', 'OTHER'] as const;
export type ClosureReason = (typeof CLOSURE_REASONS)[number];
