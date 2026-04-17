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
}

export class FeesMonthPaginatedQueryDto extends PaginationQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;

  @IsOptional()
  @IsString()
  batchId?: string;
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
