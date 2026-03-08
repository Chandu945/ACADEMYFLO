import { IsIn, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangeStudentStatusDto {
  @ApiProperty({ example: 'INACTIVE', enum: ['ACTIVE', 'INACTIVE', 'LEFT'] })
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE', 'LEFT'])
  status!: 'ACTIVE' | 'INACTIVE' | 'LEFT';

  @ApiPropertyOptional({ example: 'Family relocated' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
