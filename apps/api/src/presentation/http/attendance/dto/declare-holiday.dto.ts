import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeclareHolidayDto {
  @ApiProperty({ example: '2024-03-26', description: 'YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD format' })
  date!: string;

  @ApiPropertyOptional({ example: 'Republic Day' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
