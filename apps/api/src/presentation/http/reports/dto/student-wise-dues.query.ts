import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class StudentWiseDuesQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: '2025-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;
}
