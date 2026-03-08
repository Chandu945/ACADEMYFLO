import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  academyId!: string;

  @ApiProperty()
  batchName!: string;

  @ApiProperty({ example: ['MON', 'WED', 'FRI'] })
  days!: string[];

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
