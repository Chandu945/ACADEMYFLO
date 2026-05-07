import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class FeesMonthQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  /** Name-prefix search across the entire month — server-side so the
   *  result is complete regardless of pagination state. */
  @IsOptional()
  @IsString()
  search?: string;
}

export class FeesMonthPaginatedQueryDto extends PaginationQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  /** Name-prefix search across the entire month — server-side so the
   *  result is complete regardless of pagination state. */
  @IsOptional()
  @IsString()
  search?: string;
}

export class StudentFeeRangeQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'from must be in YYYY-MM format' })
  from!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'to must be in YYYY-MM format' })
  to!: string;
}
