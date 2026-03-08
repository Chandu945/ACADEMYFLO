import { IsNotEmpty, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class AddFollowUpDto {
  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  notes!: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}
