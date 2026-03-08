import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponse {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phoneNumber!: string;
  @ApiProperty({ enum: ['OWNER', 'STAFF', 'SUPER_ADMIN'] }) role!: string;
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] }) status!: string;
}

export class AuthDataResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty() deviceId!: string;
  @ApiProperty({ type: AuthUserResponse }) user!: AuthUserResponse;
}

export class RefreshDataResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
}
