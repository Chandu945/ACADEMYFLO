import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkStudentAttendanceDto {
  @ApiProperty({ example: 'ABSENT', enum: ['PRESENT', 'ABSENT'] })
  @IsString()
  @IsIn(['PRESENT', 'ABSENT'])
  status!: 'PRESENT' | 'ABSENT';
}
