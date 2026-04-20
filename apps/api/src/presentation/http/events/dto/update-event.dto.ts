import {
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  IsDateString,
  ArrayMaxSize,
  IsArray,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { EVENT_TYPES, TARGET_AUDIENCES } from '@academyflo/contracts';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsIn(EVENT_TYPES)
  eventType?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string | null;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string | null;

  @IsOptional()
  @IsIn(TARGET_AUDIENCES)
  targetAudience?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  batchIds?: string[];
}
