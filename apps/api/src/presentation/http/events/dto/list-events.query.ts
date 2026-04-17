import { IsOptional, IsString, IsIn, IsInt, Min, Max, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EVENT_STATUSES, EVENT_TYPES } from '@playconnect/contracts';

export class ListEventsQuery {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM format' })
  month?: string;

  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(EVENT_TYPES)
  eventType?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate must be YYYY-MM-DD format' })
  fromDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'toDate must be YYYY-MM-DD format' })
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
