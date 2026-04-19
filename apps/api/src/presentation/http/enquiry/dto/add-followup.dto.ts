import { IsNotEmpty, IsOptional, IsString, IsDateString, MaxLength, MinLength } from 'class-validator';

export class AddFollowUpDto {
  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  notes!: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}
