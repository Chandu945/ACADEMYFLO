import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentResponseDto {
  @ApiProperty({ example: 'pc_sub_20260303_abc123' })
  orderId!: string;

  @ApiProperty({ example: 'session_xxxx' })
  paymentSessionId!: string;

  @ApiProperty({ example: 499 })
  amountInr!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: 'TIER_51_100' })
  tierKey!: string;

  @ApiProperty({ example: '2026-03-04T12:00:00Z' })
  expiresAt!: string;
}
