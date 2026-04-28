import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export const SUBSCRIPTION_PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;
export type SubscriptionPaymentStatus = (typeof SUBSCRIPTION_PAYMENT_STATUSES)[number];

export class AdminPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SUBSCRIPTION_PAYMENT_STATUSES })
  @IsOptional()
  @IsIn([...SUBSCRIPTION_PAYMENT_STATUSES])
  status?: SubscriptionPaymentStatus;

  @ApiPropertyOptional({ description: 'Filter to a single academy' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  academyId?: string;

  @ApiPropertyOptional({ example: '2024-03-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD format' })
  to?: string;

  @ApiPropertyOptional({
    description: 'Surface only PENDING payments older than N minutes (default debugging window)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60 * 24 * 30)
  stuckThresholdMinutes?: number;
}
