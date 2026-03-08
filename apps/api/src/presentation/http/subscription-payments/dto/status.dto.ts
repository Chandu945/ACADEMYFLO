import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SubscriptionSnapshotDto {
  @ApiProperty({ example: 'ACTIVE_PAID' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00Z' })
  paidStartAt!: string | null;

  @ApiPropertyOptional({ example: '2026-04-30T23:59:59Z' })
  paidEndAt!: string | null;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: 'pc_sub_20260303_abc123' })
  orderId!: string;

  @ApiProperty({ enum: ['PENDING', 'SUCCESS', 'FAILED'] })
  status!: string;

  @ApiProperty({ example: 'TIER_51_100' })
  tierKey!: string;

  @ApiProperty({ example: 499 })
  amountInr!: number;

  @ApiPropertyOptional({ example: 'cf_pay_xxx' })
  providerPaymentId!: string | null;

  @ApiPropertyOptional({ example: '2026-03-04T12:00:00Z' })
  paidAt!: string | null;

  @ApiProperty({ type: SubscriptionSnapshotDto })
  subscription!: SubscriptionSnapshotDto;
}
