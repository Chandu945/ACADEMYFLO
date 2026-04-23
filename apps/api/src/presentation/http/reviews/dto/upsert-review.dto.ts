import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertReviewDto {
  @ApiProperty({ description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Optional comment (max 1000 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
