import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  idToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}
