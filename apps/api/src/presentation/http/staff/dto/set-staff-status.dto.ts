import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetStaffStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'INACTIVE' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}
