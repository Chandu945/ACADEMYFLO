import { ArrayMaxSize, ArrayUnique, IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkSetAbsencesDto {
  @ApiProperty({ description: 'Batch whose roster is being marked' })
  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @ApiProperty({
    example: ['student-1', 'student-2'],
    description: 'List of absent student IDs in the batch. Empty array = all present.',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @ArrayUnique()
  absentStudentIds!: string[];
}
