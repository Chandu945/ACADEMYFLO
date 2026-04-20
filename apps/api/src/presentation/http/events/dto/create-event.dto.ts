import {
  IsNotEmpty,
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

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(EVENT_TYPES)
  eventType?: string;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsBoolean()
  isAllDay!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsIn(TARGET_AUDIENCES)
  targetAudience?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  batchIds?: string[];
}
