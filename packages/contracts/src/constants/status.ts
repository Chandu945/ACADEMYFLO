/** Student lifecycle status exactly as per SRS */
export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'LEFT'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

/** Staff lifecycle status exactly as per SRS */
export const STAFF_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];
