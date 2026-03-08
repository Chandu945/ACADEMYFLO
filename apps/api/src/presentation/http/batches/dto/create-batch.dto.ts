import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WEEKDAYS } from '@playconnect/contracts';
import type { Weekday } from '@playconnect/contracts';

export class CreateBatchDto {
  @ApiProperty({ example: 'Morning Batch' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  batchName!: string;

  @ApiPropertyOptional({ example: ['MON', 'WED', 'FRI'], enum: [...WEEKDAYS], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...WEEKDAYS], { each: true })
  days?: Weekday[];

  @ApiPropertyOptional({ example: 'Beginner level, ages 5-8' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
