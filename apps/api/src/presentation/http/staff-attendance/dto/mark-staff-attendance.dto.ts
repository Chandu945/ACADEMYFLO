import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STAFF_ATTENDANCE_STATUSES } from '@playconnect/contracts';

export class MarkStaffAttendanceDto {
  @ApiProperty({ example: 'ABSENT', enum: [...STAFF_ATTENDANCE_STATUSES] })
  @IsString()
  @IsNotEmpty()
  @IsIn(STAFF_ATTENDANCE_STATUSES)
  status!: 'PRESENT' | 'ABSENT';
}
