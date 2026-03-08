/**
 * Minimal DTO for Cashfree webhook.
 * The actual verification is done on raw body — this is just for documentation.
 * Webhook payload structure: { data: { order: {...}, payment: {...} } }
 */
export interface CashfreeWebhookHeaders {
  'x-webhook-signature': string;
  'x-webhook-timestamp': string;
}
