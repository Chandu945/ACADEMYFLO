import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

const ENQUIRY_SOURCES = ['WALK_IN', 'PHONE', 'REFERRAL', 'SOCIAL_MEDIA', 'WEBSITE', 'OTHER'] as const;

export class CreateEnquiryDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prospectName!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  guardianName?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'Mobile number must be 10-15 digits' })
  mobileNumber!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'WhatsApp number must be 10-15 digits' })
  whatsappNumber?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  interestedIn?: string;

  @IsOptional()
  @IsIn(ENQUIRY_SOURCES)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}
