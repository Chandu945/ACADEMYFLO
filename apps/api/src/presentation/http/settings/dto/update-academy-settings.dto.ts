import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ALLOWED_REPEAT_INTERVALS } from '@playconnect/contracts';

export class UpdateAcademySettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  defaultDueDateDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  receiptPrefix?: string;

  @IsOptional()
  @IsBoolean()
  lateFeeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  gracePeriodDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  lateFeeAmountInr?: number;

  @IsOptional()
  @IsInt()
  @IsIn([...ALLOWED_REPEAT_INTERVALS])
  lateFeeRepeatIntervalDays?: number;
}
