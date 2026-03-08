import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BankDetailsDto {
  @IsString()
  @MaxLength(100)
  accountHolderName!: string;

  @IsString()
  @Matches(/^\d{9,18}$/, { message: 'Account number must be 9-18 digits' })
  accountNumber!: string;

  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'IFSC code must match format: 4 letters, 0, then 6 alphanumeric characters',
  })
  ifscCode!: string;

  @IsString()
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @MaxLength(100)
  branchName!: string;
}

export class UpdateInstituteInfoDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[\w.+-]+@[\w]+$/, { message: 'UPI ID must be in format: name@provider' })
  upiId?: string | null;
}
