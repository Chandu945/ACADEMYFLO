import { IsOptional, IsString, IsIn } from 'class-validator';

const EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;
const EVENT_TYPES = ['TOURNAMENT', 'MEETING', 'DEMO_CLASS', 'HOLIDAY', 'ANNUAL_DAY', 'TRAINING_CAMP', 'OTHER'] as const;

export class ListEventsQuery {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(EVENT_TYPES)
  eventType?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
