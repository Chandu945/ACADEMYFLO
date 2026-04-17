import { IsIn, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { STUDENT_STATUSES } from '@playconnect/contracts';
import type { StudentStatus } from '@playconnect/contracts';

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
