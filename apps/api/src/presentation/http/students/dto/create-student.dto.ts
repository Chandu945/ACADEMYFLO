import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GENDERS } from '@playconnect/contracts';
import type { Gender } from '@playconnect/contracts';
import { trimAndCollapse, normalizeEmail } from '../../common/sanitizers/string-sanitizer';

export class StudentAddressDto {
  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({ example: '400001' })
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'pincode must be exactly 6 digits' })
  pincode!: string;
}

export class StudentGuardianDto {
  @ApiProperty({ example: 'Raj Sharma' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  name!: string;

  @ApiProperty({ example: '+919876543210', description: 'E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'mobile must be in E.164 format (e.g. +919876543210)',
  })
  mobile!: string;

  @ApiProperty({ example: 'raj@example.com' })
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  email!: string;
}

export class StudentInstituteInfoDto {
  @ApiPropertyOptional({ example: 'Delhi Public School' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  schoolName?: string;

  @ApiPropertyOptional({ example: 'A-42' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rollNumber?: string;

  @ApiPropertyOptional({ example: '10th' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  standard?: string;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'Arun Sharma' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  fullName!: string;

  @ApiProperty({ example: '2010-05-15', description: 'ISO date string (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD format' })
  dateOfBirth!: string;

  @ApiProperty({ example: 'MALE', enum: [...GENDERS] })
  @IsString()
  @IsIn([...GENDERS])
  gender!: Gender;

  @ApiProperty({ type: StudentAddressDto })
  @ValidateNested()
  @Type(() => StudentAddressDto)
  address!: StudentAddressDto;

  @ApiProperty({ type: StudentGuardianDto })
  @ValidateNested()
  @Type(() => StudentGuardianDto)
  guardian!: StudentGuardianDto;

  @ApiProperty({ example: '2024-01-01', description: 'ISO date string (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'joiningDate must be YYYY-MM-DD format' })
  joiningDate!: string;

  @ApiProperty({ example: 500, description: 'Monthly fee in INR (integer > 0)' })
  @IsInt()
  @Min(1)
  monthlyFee!: number;

  @ApiPropertyOptional({ example: '+919876543211' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'mobileNumber must be in E.164 format (e.g. +919876543211)',
  })
  mobileNumber?: string;

  @ApiPropertyOptional({ example: 'arun@example.com' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  email?: string;

  @ApiPropertyOptional({ example: 'Krishna' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  fatherName?: string;

  @ApiPropertyOptional({ example: 'Lakshmi' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  motherName?: string;

  @ApiPropertyOptional({ example: '123456789012', description: 'Exactly 12 digits' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'aadhaarNumber must be exactly 12 digits' })
  aadhaarNumber?: string;

  @ApiPropertyOptional({ example: 'General' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  caste?: string;

  @ApiPropertyOptional({ example: '919491823468', description: '10-15 digits with country code' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'whatsappNumber must be 10-15 digits' })
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: '456 Park Lane, Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressText?: string;

  @ApiPropertyOptional({ type: StudentInstituteInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentInstituteInfoDto)
  instituteInfo?: StudentInstituteInfoDto;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...', description: 'Pre-uploaded photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ example: 'Student@123', description: 'Min 6 characters' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
