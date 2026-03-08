import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BirthdaysQueryDto {
  @ApiProperty({ enum: ['today', 'month'], description: 'Scope: today or this month' })
  @IsIn(['today', 'month'])
  scope!: 'today' | 'month';
}
