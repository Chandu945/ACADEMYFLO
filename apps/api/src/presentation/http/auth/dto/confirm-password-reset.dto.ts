import { IsEmail, IsString, Length, Matches, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'rajesh@example.com' })
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp!: string;

  @ApiProperty({ example: 'NewSecureP@ss1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
    message: 'newPassword must contain uppercase, lowercase, digit, and special character',
  })
  newPassword!: string;
}
