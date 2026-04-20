import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
import { CLOSURE_REASONS } from '@academyflo/contracts';

export class CloseEnquiryDto {
  @IsNotEmpty()
  @IsIn(CLOSURE_REASONS)
  closureReason!: string;

  @IsOptional()
  @IsString()
  convertedStudentId?: string;
}
