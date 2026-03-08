import { IsIn, IsNotEmpty } from 'class-validator';

const EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;

export class ChangeEventStatusDto {
  @IsNotEmpty()
  @IsIn(EVENT_STATUSES)
  status!: string;
}
