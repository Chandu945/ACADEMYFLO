import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STUDENT_ATTENDANCE_STATUSES } from '@playconnect/contracts';

export class MarkStudentAttendanceDto {
  @ApiProperty({ example: 'ABSENT', enum: [...STUDENT_ATTENDANCE_STATUSES] })
  @IsString()
  @IsIn(STUDENT_ATTENDANCE_STATUSES)
  status!: 'PRESENT' | 'ABSENT';
}
