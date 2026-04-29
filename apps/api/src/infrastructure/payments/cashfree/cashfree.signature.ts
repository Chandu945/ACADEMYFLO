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
      this.debugLog('missing-input', signature, timestamp, rawBody, '');
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
      const ok = equal && sigBuffer.length === expectedBuffer.length;
      if (!ok) {
        this.debugLog('mismatch', signature, timestamp, rawBody, expectedSignature);
      }
      return ok;
    } catch {
      this.debugLog('exception', signature, timestamp, rawBody, '');
      return false;
    }
  }

  // TEMPORARY — remove once webhook signature mismatch is diagnosed.
  // Logs first/last 4 chars only — never the full secret or signature.
  private debugLog(
    reason: string,
    received: string,
    timestamp: string,
    rawBody: Buffer,
    expected: string,
  ): void {
    const safe = (s: string): string =>
      s && s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : `(len=${s ? s.length : 0})`;
    const bodyHead = rawBody.toString('utf-8').slice(0, 80).replace(/\s+/g, ' ');
    console.error(
      JSON.stringify({
        level: 50,
        time: Date.now(),
        msg: '[WEBHOOK_DEBUG]',
        reason,
        secretLen: this.webhookSecret.length,
        secretSafe: safe(this.webhookSecret),
        timestampReceived: timestamp,
        timestampLen: timestamp.length,
        bodyLen: rawBody.length,
        bodyHead,
        expectedSig: safe(expected),
        expectedSigLen: expected.length,
        receivedSig: safe(received),
        receivedSigLen: received.length,
      }),
    );
  }
}
