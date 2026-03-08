import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

const CLOSURE_REASONS = ['CONVERTED', 'NOT_INTERESTED', 'OTHER'] as const;

export class CloseEnquiryDto {
  @IsNotEmpty()
  @IsIn(CLOSURE_REASONS)
  closureReason!: string;

  @IsOptional()
  @IsString()
  convertedStudentId?: string;
}
