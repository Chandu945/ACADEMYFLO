import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimAndCollapse, normalizeEmail } from '../../common/sanitizers/string-sanitizer';

export class OwnerSignupDto {
  @ApiProperty({ example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  fullName!: string;

  @ApiProperty({ example: '+919876543210', description: 'E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'phoneNumber must be in E.164 format (e.g. +919876543210)',
  })
  phoneNumber!: string;

  @ApiProperty({ example: 'rajesh@example.com' })
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  email!: string;

  @ApiProperty({ description: 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password!: string;

  @ApiPropertyOptional({ description: 'Client device identifier; server generates if omitted' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
