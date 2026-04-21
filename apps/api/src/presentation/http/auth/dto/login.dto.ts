import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'rajesh@example.com', description: 'Email or E.164 phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  identifier!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ description: 'Client device identifier; server generates if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}
