export type EventStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type EventType = 'TOURNAMENT' | 'MEETING' | 'DEMO_CLASS' | 'HOLIDAY' | 'ANNUAL_DAY' | 'TRAINING_CAMP' | 'OTHER';
export type TargetAudience = 'ALL' | 'STUDENTS' | 'STAFF' | 'PARENTS';

export type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  targetAudience: string | null;
  batchIds: string[];
  status: EventStatus;
  createdBy: string;
  createdAt: string;
};

export type EventDetail = EventListItem & {
  updatedAt: string;
  photoCount?: number;
};

export type CreateEventRequest = {
  title: string;
  description?: string;
  eventType?: EventType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  location?: string;
  targetAudience?: TargetAudience;
  batchIds?: string[];
};

export type UpdateEventRequest = Partial<CreateEventRequest>;

export type EventSummary = {
  thisMonth: {
    total: number;
    upcoming: number;
  };
};

export type EventListFilters = {
  month?: string;
  status?: EventStatus;
  eventType?: EventType;
  fromDate?: string;
  toDate?: string;
};
