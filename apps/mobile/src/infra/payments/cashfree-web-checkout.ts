import { Platform } from 'react-native';
import { env } from '../env';

// Web-only globals — only used when Platform.OS === 'web'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _global = globalThis as any;

/**
 * Opens Cashfree checkout.
 *
 * - Web: Uses the Cashfree JS SDK (loaded from CDN) to render a payment modal.
 * - Native: Uses react-native-cashfree-pg-sdk to render the native checkout
 *   sheet. Cashfree v3 has no hostable checkout URL, so we must use the SDK
 *   rather than Linking.openURL (which would route to cashfree.com's 404).
 *
 * In both cases this resolves once the checkout UI has been opened. The
 * subscription status polling in use-payment-flow handles the actual outcome
 * via the backend webhook — these callbacks are advisory.
 */
export async function openCashfreeCheckout(
  paymentSessionId: string,
  orderId: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    return openWebCheckout(paymentSessionId);
  }

  return openNativeCheckout(paymentSessionId, orderId);
}

async function openNativeCheckout(
  paymentSessionId: string,
  orderId: string,
): Promise<void> {
  // Dynamic import keeps the native module out of the web bundle. The web
  // bundle would fail to resolve react-native-cashfree-pg-sdk's native imports.
  const sdk = await import('react-native-cashfree-pg-sdk');
  const contract = await import('cashfree-pg-api-contract');
  const { CFPaymentGatewayService } = sdk;
  const { CFDropCheckoutPayment, CFSession, CFEnvironment } = contract;

  const environment =
    env.APP_ENV === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;

  // Log always (not just in __DEV__) — release builds are where we need this
  // visibility most, because onError surfacing native-SDK failures (invalid
  // session, unregistered SHA-256, missing activities) is the only way to
  // diagnose "checkout never opened" without adb logcat access.
  CFPaymentGatewayService.setCallback({
    onVerify(verifiedOrderId: string) {
      console.log('[Cashfree] onVerify', verifiedOrderId);
    },
    onError(error, failedOrderId: string) {
      const msg =
        (typeof error?.getMessage === 'function' && error.getMessage()) ||
        (typeof error?.getCode === 'function' && error.getCode()) ||
        String(error);
      console.error('[Cashfree] onError', failedOrderId, msg);
    },
  });

  try {
    const session = new CFSession(paymentSessionId, orderId, environment);
    const payment = new CFDropCheckoutPayment(session, null, null);
    CFPaymentGatewayService.doPayment(payment);
  } catch (err) {
    console.error('[Cashfree] doPayment threw', err);
    throw err;
  }
}

/**
 * Load the Cashfree JS SDK from CDN and open checkout in a modal/redirect.
 */
async function openWebCheckout(paymentSessionId: string): Promise<void> {
  const cashfree = await loadCashfreeSDK();

  return new Promise<void>((resolve, reject) => {
    try {
      const result = cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      });

      // The SDK returns a promise-like that resolves when the modal closes
      if (result && typeof result.then === 'function') {
        result.then(() => resolve()).catch(() => resolve());
      } else {
        // Modal opened — resolve immediately; polling handles the rest
        resolve();
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Singleton: reuse the Cashfree SDK instance once loaded
let cashfreeInstance: CashfreeInstance | null = null;

interface CashfreeInstance {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_modal' | '_blank';
  }): Promise<void> | void;
}

interface CashfreeLoader {
  initialise(options: { mode: string }): CashfreeInstance;
}

async function loadCashfreeSDK(): Promise<CashfreeInstance> {
  if (cashfreeInstance) return cashfreeInstance;

  const mode = env.APP_ENV === 'production' ? 'production' : 'sandbox';

  // Try the npm package first (bundled by webpack)
  try {
    // @ts-expect-error - dynamic import for web-only module that may not be resolvable at build time
    const mod = await (import('@cashfreepayments/cashfree-js') as Promise<{ load: unknown }>);
    const cf = await (mod.load as (options: { mode: string }) => Promise<CashfreeInstance>)({ mode });
    cashfreeInstance = cf;
    return cf;
  } catch {
    // npm package not available — fall back to CDN script tag
  }

  // CDN fallback: inject <script> and wait for window.Cashfree
  return new Promise<CashfreeInstance>((resolve, reject) => {
    const doc = _global.document;
    const win = _global.window;

    const existing = doc?.querySelector('script[src*="sdk.cashfree.com"]');
    if (existing && win?.['Cashfree']) {
      const cf = (win['Cashfree'] as CashfreeLoader).initialise({ mode });
      cashfreeInstance = cf;
      resolve(cf);
      return;
    }

    const script = doc?.createElement('script');
    if (!script || !doc) {
      reject(new Error('DOM not available'));
      return;
    }
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => {
      try {
        const cf = (win['Cashfree'] as CashfreeLoader).initialise({ mode });
        cashfreeInstance = cf;
        resolve(cf);
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    doc.head.appendChild(script);
  });
}
