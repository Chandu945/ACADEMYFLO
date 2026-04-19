import { IsString, IsNumber, IsPositive, Max, IsIn, Matches, MinLength } from 'class-validator';

export class ConvertToStudentDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'joiningDate must be YYYY-MM-DD' })
  joiningDate!: string;

  @IsNumber()
  @IsPositive()
  @Max(999999, { message: 'monthlyFee must not exceed ₹9,99,999' })
  monthlyFee!: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth!: string;

  @IsString()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender!: string;

  @IsString()
  @MinLength(1)
  addressLine1!: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  state!: string;

  @IsString()
  @Matches(/^\d{5,6}$/, { message: 'pincode must be 5-6 digits' })
  pincode!: string;
}
