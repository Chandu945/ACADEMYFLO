import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChildAttendanceQueryDto {
  @ApiProperty({ description: 'Month in YYYY-MM format' })
  @IsString()
  @IsNotEmpty()
  month!: string;
}

export class ChildFeesQueryDto {
  @ApiProperty({ description: 'Start month in YYYY-MM format' })
  @IsString()
  @IsNotEmpty()
  from!: string;

  @ApiProperty({ description: 'End month in YYYY-MM format' })
  @IsString()
  @IsNotEmpty()
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
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
  newPassword!: string;
}
