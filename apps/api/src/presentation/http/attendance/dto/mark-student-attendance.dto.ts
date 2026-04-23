import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STUDENT_ATTENDANCE_STATUSES } from '@academyflo/contracts';

export class MarkStudentAttendanceDto {
  @ApiProperty({ description: 'Batch the student is being marked in' })
  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @ApiProperty({ example: 'ABSENT', enum: [...STUDENT_ATTENDANCE_STATUSES] })
  @IsString()
  @IsIn(STUDENT_ATTENDANCE_STATUSES)
  status!: 'PRESENT' | 'ABSENT';
}
