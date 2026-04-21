import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChildAttendanceQueryDto {
  @ApiProperty({ description: 'Month in YYYY-MM format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;
}

export class ChildFeesQueryDto {
  @ApiProperty({ description: 'Start month in YYYY-MM format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'from must be in YYYY-MM format' })
  from!: string;

  @ApiProperty({ description: 'End month in YYYY-MM format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'to must be in YYYY-MM format' })
  to!: string;
}

export class InitiateFeePaymentDto {
  @ApiProperty({ description: 'Fee due ID to pay' })
  @IsString()
  @IsNotEmpty()
  feeDueId!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phoneNumber must be in E.164 format (e.g. +919876543210)' })
  phoneNumber?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
    message: 'Password must contain at least one lowercase, one uppercase, one digit, and one special character',
  })
  newPassword!: string;
}
