/** Student attendance status exactly as per SRS */
export const STUDENT_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT'] as const;
export type StudentAttendanceStatus = (typeof STUDENT_ATTENDANCE_STATUSES)[number];

/** Staff attendance status exactly as per SRS */
export const STAFF_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT'] as const;
export type StaffAttendanceStatus = (typeof STAFF_ATTENDANCE_STATUSES)[number];
