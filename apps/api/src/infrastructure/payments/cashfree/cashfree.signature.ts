import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookSignatureVerifier } from '@application/subscription-payments/use-cases/handle-cashfree-webhook.usecase';

/**
 * Cashfree webhook signature verification.
 *
 * Signature = base64(hmac_sha256(webhookSecret, timestamp + rawBody))
 * Compare to x-webhook-signature header using timing-safe comparison.
 */
export class CashfreeSignatureVerifier implements WebhookSignatureVerifier {
  constructor(private readonly webhookSecret: string) {}

  verify(rawBody: Buffer, signature: string, timestamp: string): boolean {
    if (!signature || !timestamp || !this.webhookSecret) {
      return false;
    }

    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(timestamp + rawBody.toString('utf-8'))
      .digest('base64');

    try {
      const sigBuffer = Buffer.from(signature, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}
