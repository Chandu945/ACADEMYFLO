import { Injectable } from '@nestjs/common';
import type { PaymentProviderPort } from '@application/subscription/ports/payment-provider.port';

@Injectable()
export class CashfreePaymentProvider implements PaymentProviderPort {
  async createCheckout(_academyId: string, _tierKey: string): Promise<{ checkoutUrl: string }> {
    throw new Error('Payment provider not implemented');
  }

  async handleWebhook(_payload: unknown): Promise<void> {
    throw new Error('Payment provider not implemented');
  }
}
