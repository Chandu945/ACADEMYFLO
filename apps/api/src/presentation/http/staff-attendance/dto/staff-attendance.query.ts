import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class StaffAttendanceQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: '2024-03-15', description: 'YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD format' })
  date!: string;

  override pageSize: number = 50;
}

export class StaffAttendanceDateOnlyQueryDto {
  @ApiProperty({ example: '2024-03-15', description: 'YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD format' })
  date!: string;
}
