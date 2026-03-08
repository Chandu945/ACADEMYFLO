import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkStaffAttendanceDto {
  @ApiProperty({ example: 'ABSENT', enum: ['PRESENT', 'ABSENT'] })
  @IsString()
  @IsIn(['PRESENT', 'ABSENT'])
  status!: 'PRESENT' | 'ABSENT';
}
