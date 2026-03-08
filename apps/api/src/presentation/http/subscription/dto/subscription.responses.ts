import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PendingTierChangeResponse {
  @ApiProperty({ enum: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS'] })
  tierKey!: string;

  @ApiProperty() effectiveAt!: string;
}

export class TierPricingResponse {
  @ApiProperty({ enum: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS'] })
  tierKey!: string;

  @ApiProperty() min!: number;

  @ApiPropertyOptional() max!: number | null;

  @ApiProperty() priceInr!: number;
}

export class SubscriptionMeResponse {
  @ApiProperty({ enum: ['TRIAL', 'ACTIVE_PAID', 'EXPIRED_GRACE', 'BLOCKED', 'DISABLED'] })
  status!: string;

  @ApiProperty() trialEndAt!: string;

  @ApiPropertyOptional() paidEndAt!: string | null;

  @ApiPropertyOptional({ enum: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS'] })
  tierKey!: string | null;

  @ApiProperty() daysRemaining!: number;

  @ApiProperty() canAccessApp!: boolean;

  @ApiPropertyOptional() blockReason!: string | null;

  @ApiProperty() activeStudentCount!: number;

  @ApiPropertyOptional({ enum: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS'] })
  currentTierKey!: string | null;

  @ApiProperty({ enum: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS'] })
  requiredTierKey!: string;

  @ApiPropertyOptional({ type: PendingTierChangeResponse })
  pendingTierChange!: PendingTierChangeResponse | null;

  @ApiProperty({ type: [TierPricingResponse] })
  tiers!: TierPricingResponse[];
}
