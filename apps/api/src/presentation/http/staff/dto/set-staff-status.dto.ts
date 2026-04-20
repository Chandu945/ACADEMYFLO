import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STAFF_STATUSES } from '@academyflo/contracts';
import type { StaffStatus } from '@academyflo/contracts';

export class SetStaffStatusDto {
  @ApiProperty({ enum: [...STAFF_STATUSES], example: 'INACTIVE' })
  @IsString()
  @IsNotEmpty()
  @IsIn(STAFF_STATUSES)
  status!: StaffStatus;
}
