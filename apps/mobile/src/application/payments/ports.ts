export interface CheckoutPort {
  openCheckout(paymentSessionId: string, orderId: string): Promise<void>;
}
