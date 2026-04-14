export const EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = ['TOURNAMENT', 'MEETING', 'DEMO_CLASS', 'HOLIDAY', 'ANNUAL_DAY', 'TRAINING_CAMP', 'OTHER'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const TARGET_AUDIENCES = ['ALL', 'STUDENTS', 'STAFF', 'PARENTS'] as const;
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];
