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

      // Pad both buffers to equal length so timingSafeEqual always runs in
      // constant time, avoiding length-leaking via an early return.
      const maxLen = Math.max(sigBuffer.length, expectedBuffer.length);
      const paddedSig = Buffer.alloc(maxLen);
      const paddedExpected = Buffer.alloc(maxLen);
      sigBuffer.copy(paddedSig);
      expectedBuffer.copy(paddedExpected);

      const equal = timingSafeEqual(paddedSig, paddedExpected);
      // Reject if original lengths differed (attacker-supplied signature was wrong size)
      return equal && sigBuffer.length === expectedBuffer.length;
    } catch {
      return false;
    }
  }
}
