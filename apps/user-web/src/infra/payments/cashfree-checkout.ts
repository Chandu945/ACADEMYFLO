'use client';

import { publicEnv } from '@/infra/env';

/**
 * Web-only Cashfree checkout helper for user-web.
 *
 * Mirrors apps/mobile/src/infra/payments/cashfree-web-checkout.ts so the two
 * platforms share the same payment-session contract: backend returns a
 * paymentSessionId, this helper opens the hosted modal, the page polls
 * /api/subscription/payments/:orderId for terminal status.
 *
 * The Cashfree v3 web SDK has no public hostable URL — paymentSessionId can
 * only be redeemed via the SDK, so we cannot fall back to window.location.
 */

interface CashfreeInstance {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_modal' | '_blank';
  }): Promise<unknown> | unknown;
}

interface CashfreeLoader {
  initialise(options: { mode: string }): CashfreeInstance;
}

let cashfreeInstance: CashfreeInstance | null = null;

async function loadCashfreeSDK(): Promise<CashfreeInstance> {
  if (cashfreeInstance) return cashfreeInstance;

  const mode = publicEnv().NEXT_PUBLIC_APP_ENV === 'production' ? 'production' : 'sandbox';

  // Try the npm package first (bundled by Next/webpack). The package ships
  // no types, so we cast through `unknown` after a dynamic import.
  try {
    // @ts-expect-error — @cashfreepayments/cashfree-js has no type declarations
    const mod = await import('@cashfreepayments/cashfree-js');
    const load = (mod as unknown as { load: (o: { mode: string }) => Promise<CashfreeInstance> }).load;
    const cf = await load({ mode });
    cashfreeInstance = cf;
    return cf;
  } catch {
    // npm package missing — fall back to CDN script tag
  }

  return new Promise<CashfreeInstance>((resolve, reject) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      reject(new Error('Cashfree SDK requires a browser environment'));
      return;
    }

    const win = window as unknown as { Cashfree?: CashfreeLoader };
    const existing = document.querySelector('script[src*="sdk.cashfree.com"]');
    if (existing && win.Cashfree) {
      const cf = win.Cashfree.initialise({ mode });
      cashfreeInstance = cf;
      resolve(cf);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => {
      try {
        if (!win.Cashfree) {
          reject(new Error('Cashfree SDK loaded but global not found'));
          return;
        }
        const cf = win.Cashfree.initialise({ mode });
        cashfreeInstance = cf;
        resolve(cf);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

export async function openCashfreeCheckout(paymentSessionId: string): Promise<void> {
  const cashfree = await loadCashfreeSDK();
  const result = cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_modal',
  });
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    await (result as Promise<unknown>).catch(() => {
      // Modal close after error or user dismissal — caller resumes polling
      // for terminal state via the existing sessionStorage path.
    });
  }
}
