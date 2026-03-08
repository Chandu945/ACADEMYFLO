import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class StaffAttendanceMonthlyQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: '2024-03', description: 'YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM format' })
  month!: string;

  override pageSize: number = 50;
}
