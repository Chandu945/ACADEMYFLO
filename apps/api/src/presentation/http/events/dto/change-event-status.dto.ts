import { IsIn, IsNotEmpty } from 'class-validator';
import { EVENT_STATUSES } from '@playconnect/contracts';

export class ChangeEventStatusDto {
  @IsNotEmpty()
  @IsIn(EVENT_STATUSES)
  status!: string;
}
