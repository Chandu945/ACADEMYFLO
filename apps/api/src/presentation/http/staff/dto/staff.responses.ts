import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffQualificationInfoResponse {
  @ApiPropertyOptional()
  qualification!: string | null;

  @ApiPropertyOptional()
  position!: string | null;
}

export class StaffSalaryConfigResponse {
  @ApiPropertyOptional()
  amount!: number | null;

  @ApiProperty()
  frequency!: string;
}

export class StaffResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phoneNumber!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  academyId!: string;

  @ApiPropertyOptional()
  startDate!: Date | null;

  @ApiPropertyOptional()
  gender!: 'MALE' | 'FEMALE' | null;

  @ApiPropertyOptional()
  whatsappNumber!: string | null;

  @ApiPropertyOptional()
  mobileNumber!: string | null;

  @ApiPropertyOptional()
  address!: string | null;

  @ApiPropertyOptional({ type: StaffQualificationInfoResponse })
  qualificationInfo!: StaffQualificationInfoResponse | null;

  @ApiPropertyOptional({ type: StaffSalaryConfigResponse })
  salaryConfig!: StaffSalaryConfigResponse | null;

  @ApiPropertyOptional()
  profilePhotoUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
