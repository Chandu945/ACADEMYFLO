import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ENQUIRY_SOURCES } from '@playconnect/contracts';

export class UpdateEnquiryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prospectName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianName?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'Mobile number must be 10-15 digits' })
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'WhatsApp number must be 10-15 digits' })
  whatsappNumber?: string | null;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  interestedIn?: string | null;

  @IsOptional()
  @IsIn([...ENQUIRY_SOURCES, null])
  source?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string | null;
}
