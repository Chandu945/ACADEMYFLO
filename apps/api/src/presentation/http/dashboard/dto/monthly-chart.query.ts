import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MonthlyChartQueryDto {
  @ApiProperty({ example: 2026, description: 'Year for chart data' })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;
}
