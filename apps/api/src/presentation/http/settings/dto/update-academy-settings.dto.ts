import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
}
