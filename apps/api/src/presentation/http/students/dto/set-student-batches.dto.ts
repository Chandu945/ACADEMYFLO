import { IsArray, IsString } from 'class-validator';

export class SetStudentBatchesDto {
  @IsArray()
  @IsString({ each: true })
  batchIds!: string[];
}
