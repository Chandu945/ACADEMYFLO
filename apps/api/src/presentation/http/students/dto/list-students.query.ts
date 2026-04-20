import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { STUDENT_STATUSES, FEE_FILTERS } from '@academyflo/contracts';
import type { StudentStatus, FeeFilter } from '@academyflo/contracts';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class ListStudentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: [...STUDENT_STATUSES] })
  @IsOptional()
  @IsString()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatus;

  @ApiPropertyOptional({ description: 'Prefix search on student name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: [...FEE_FILTERS] })
  @IsOptional()
  @IsIn(FEE_FILTERS)
  feeFilter?: FeeFilter;

  @ApiPropertyOptional({ description: 'Month in YYYY-MM format for fee filtering' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM format' })
  month?: string;

  @ApiPropertyOptional({ description: 'Filter students by batch ID' })
  @IsOptional()
  @IsString()
  batchId?: string;
}
