import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestAccountDeletionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  confirmationPhrase!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
