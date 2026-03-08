import { Linking } from 'react-native';
import { env } from '../env';

/**
 * Opens Cashfree web checkout in the device browser.
 * No secrets are exposed — only paymentSessionId is needed.
 *
 * In production, consider using the Cashfree React Native SDK for a native experience.
 * For MVP, web checkout is safe and requires no additional native dependencies.
 */
export async function openCashfreeCheckout(
  paymentSessionId: string,
  orderId: string,
): Promise<void> {
  // Cashfree provides a standard checkout URL format for web-based payments
  const isSandbox = env.APP_ENV !== 'production';
  const baseUrl = isSandbox
    ? 'https://sandbox.cashfree.com/pg/view/order'
    : 'https://cashfree.com/pg/view/order';

  // The checkout URL uses the payment session ID
  const checkoutUrl = `${baseUrl}/${paymentSessionId}`;

  // Validate the URL points to an expected Cashfree domain
  const parsedUrl = new URL(checkoutUrl);
  const allowedHosts = ['sandbox.cashfree.com', 'cashfree.com'];
  if (!allowedHosts.includes(parsedUrl.hostname)) {
    throw new Error('Invalid payment URL: unexpected domain');
  }

  const canOpen = await Linking.canOpenURL(checkoutUrl);
  if (canOpen) {
    await Linking.openURL(checkoutUrl);
  } else {
    throw new Error('Unable to open payment page');
  }
}
