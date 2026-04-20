import { IsIn, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { STUDENT_STATUSES } from '@academyflo/contracts';
import type { StudentStatus } from '@academyflo/contracts';

export class ChangeStudentStatusDto {
  @ApiProperty({ example: 'INACTIVE', enum: [...STUDENT_STATUSES] })
  @IsString()
  @IsIn(STUDENT_STATUSES)
  status!: StudentStatus;

  @ApiPropertyOptional({ example: 'Family relocated' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
