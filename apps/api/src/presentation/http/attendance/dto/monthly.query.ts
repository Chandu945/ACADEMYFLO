import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class MonthlyQueryDto {
  @ApiProperty({ example: '2024-03', description: 'YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM format' })
  month!: string;
}

export class MonthlyPaginatedQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: '2024-03', description: 'YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM format' })
  month!: string;

  @ApiPropertyOptional({ description: 'Search students by name' })
  @IsOptional()
  @IsString()
  search?: string;

  override pageSize: number = 50;
}
