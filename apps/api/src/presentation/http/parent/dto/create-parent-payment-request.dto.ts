import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParentPaymentRequestDto {
  @IsString()
  studentId!: string;

  @IsString()
  feeDueId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(['UPI', 'BANK', 'CASH', 'OTHER'], {
    message: 'paymentMethod must be one of UPI, BANK, CASH, OTHER',
  })
  paymentMethod!: 'UPI' | 'BANK' | 'CASH' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentRefNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  parentNote?: string;
}
