import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TIER_RANGES } from '@playconnect/contracts';
import type { TierKey } from '@playconnect/contracts';

const TIER_KEYS = Object.keys(TIER_RANGES);

export class SetSubscriptionManualDto {
  @ApiProperty({ example: '2024-04-01T00:00:00.000Z' })
  @IsDateString()
  paidStartAt!: string;

  @ApiProperty({ example: '2025-04-01T00:00:00.000Z' })
  @IsDateString()
  paidEndAt!: string;

  @ApiProperty({ enum: TIER_KEYS })
  @IsIn(TIER_KEYS)
  tierKey!: TierKey;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manualNotes?: string;
}

export class DeactivateSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manualNotes?: string;
}

export class SetLoginDisabledDto {
  @ApiProperty()
  @IsBoolean()
  disabled!: boolean;
}

export class ResetOwnerPasswordParamDto {
  @IsString()
  @IsNotEmpty()
  academyId!: string;
}
