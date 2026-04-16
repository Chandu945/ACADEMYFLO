import {
  IsEmail,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  Matches,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { trimAndCollapse, normalizeEmail } from '../../common/sanitizers/string-sanitizer';
import { StaffQualificationInfoDto, StaffSalaryConfigDto } from './create-staff.dto';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  fullName?: string;

  @ApiPropertyOptional({ example: '+919876543211', description: 'E.164 format' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'phoneNumber must be in E.164 format (e.g. +919876543210)',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  email?: string;

  @ApiPropertyOptional({
    description: 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', null])
  gender?: 'MALE' | 'FEMALE' | null;

  @ApiPropertyOptional({ example: '+919876543210', description: 'E.164 format' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'whatsappNumber must be in E.164 format (e.g. +919876543210)',
  })
  whatsappNumber?: string | null;

  @ApiPropertyOptional({ example: '+919876543210', description: 'E.164 format' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'mobileNumber must be in E.164 format (e.g. +919876543210)',
  })
  mobileNumber?: string | null;

  @ApiPropertyOptional({ example: '123, MG Road, Bangalore' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ type: StaffQualificationInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffQualificationInfoDto)
  qualificationInfo?: StaffQualificationInfoDto | null;

  @ApiPropertyOptional({ type: StaffSalaryConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffSalaryConfigDto)
  salaryConfig?: StaffSalaryConfigDto | null;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  profilePhotoUrl?: string | null;
}
