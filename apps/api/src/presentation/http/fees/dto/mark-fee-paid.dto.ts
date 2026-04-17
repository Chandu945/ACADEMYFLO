import { IsOptional, IsIn } from 'class-validator';
import { PAYMENT_LABELS } from '@playconnect/contracts';
import type { PaymentLabel } from '@playconnect/contracts';

export class MarkFeePaidBodyDto {
  @IsOptional()
  @IsIn(PAYMENT_LABELS)
  paymentLabel?: PaymentLabel;
}
