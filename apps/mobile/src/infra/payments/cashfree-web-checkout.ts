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
 * Resolves on onVerify (user finished checkout — backend webhook will confirm
 * via polling) and rejects on onError (invalid session, env mismatch,
 * unregistered SHA-256, etc.). The reject path is what stops use-payment-flow
 * from entering a doomed polling loop when Cashfree closes without a payment.
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

class CashfreeCheckoutError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'CashfreeCheckoutError';
  }
}

interface CFErrorLike {
  getCode?: () => string;
  getMessage?: () => string;
}

async function openNativeCheckout(
  paymentSessionId: string,
  orderId: string,
): Promise<void> {
  const sdk = await import('react-native-cashfree-pg-sdk');
  const contract = await import('cashfree-pg-api-contract');
  const { CFPaymentGatewayService } = sdk;
  const { CFDropCheckoutPayment, CFSession, CFEnvironment } = contract;

  const environment =
    env.APP_ENV === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    // Always release the global SDK callback when this attempt completes —
    // otherwise stale callbacks from prior attempts accumulate and hold
    // captured promise references for the lifetime of the app session.
    const release = () => {
      try {
        // Cashfree's SDK is happy with an empty noop callback object.
        CFPaymentGatewayService.setCallback({
          onVerify() {},
          onError() {},
        });
      } catch {
        /* SDK teardown errors are not actionable */
      }
    };
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      release();
      fn();
    };

    CFPaymentGatewayService.setCallback({
      onVerify(verifiedOrderId: string) {
        if (__DEV__) console.warn('[Cashfree] onVerify', verifiedOrderId);
        // Match orderId to ignore stale callbacks from a prior attempt.
        if (verifiedOrderId !== orderId) return;
        settle(resolve);
      },
      onError(error: CFErrorLike, failedOrderId: string) {
        const code =
          (typeof error?.getCode === 'function' && error.getCode()) || undefined;
        const msg =
          (typeof error?.getMessage === 'function' && error.getMessage()) ||
          code ||
          String(error);
        if (__DEV__) console.error('[Cashfree] onError', failedOrderId, code, msg);
        if (failedOrderId !== orderId) return;
        settle(() => reject(new CashfreeCheckoutError(msg, code)));
      },
    });

    try {
      const session = new CFSession(paymentSessionId, orderId, environment);
      const payment = new CFDropCheckoutPayment(session, null, null);
      CFPaymentGatewayService.doPayment(payment);
    } catch (err) {
      if (__DEV__) console.error('[Cashfree] doPayment threw', err);
      settle(() => reject(err instanceof Error ? err : new CashfreeCheckoutError(String(err))));
    }
  });
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
