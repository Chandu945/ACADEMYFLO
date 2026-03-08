import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WEEKDAYS } from '@playconnect/contracts';
import type { Weekday } from '@playconnect/contracts';

export class UpdateBatchDto {
  @ApiPropertyOptional({ example: 'Evening Batch' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  batchName?: string;

  @ApiPropertyOptional({ example: ['TUE', 'THU', 'SAT'], enum: [...WEEKDAYS], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...WEEKDAYS], { each: true })
  days?: Weekday[];

  @ApiPropertyOptional({ example: 'Advanced level', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
