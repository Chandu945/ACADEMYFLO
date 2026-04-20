import { IsOptional, IsIn } from 'class-validator';
import { PAYMENT_LABELS } from '@academyflo/contracts';
import type { PaymentLabel } from '@academyflo/contracts';

export class MarkFeePaidBodyDto {
  @IsOptional()
  @IsIn(PAYMENT_LABELS)
  paymentLabel?: PaymentLabel;
}
