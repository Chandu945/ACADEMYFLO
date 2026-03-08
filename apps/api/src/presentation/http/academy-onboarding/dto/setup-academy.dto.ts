import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimAndCollapse } from '../../common/sanitizers/string-sanitizer';

export class AddressDto {
  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  line1!: string;

  @ApiPropertyOptional({ example: 'Floor 2' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  line2?: string;

  @ApiProperty({ example: 'Hyderabad' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  city!: string;

  @ApiProperty({ example: 'Telangana' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  state!: string;

  @ApiProperty({ example: '500001', description: 'Indian PIN code (6 digits)' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit Indian PIN code' })
  pincode!: string;

  @ApiProperty({ example: 'India', default: 'India' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  country!: string;
}

export class SetupAcademyDto {
  @ApiProperty({ example: 'Sunrise Dance Academy' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? trimAndCollapse(value) : value))
  academyName!: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
