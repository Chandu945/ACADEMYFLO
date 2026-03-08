export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/**
 * Placeholder port for Cashfree payment integration.
 * Implementations MUST throw Not Implemented until the payment flow is built.
 */
export interface PaymentProviderPort {
  createCheckout(academyId: string, tierKey: string): Promise<{ checkoutUrl: string }>;
  handleWebhook(payload: unknown): Promise<void>;
}
