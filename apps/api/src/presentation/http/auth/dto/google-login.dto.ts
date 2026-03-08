import { IsString, IsOptional } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  idToken!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
