# Mobile — Native Setup Follow-Ups

Two bugs flagged in the audit require native build configuration and on-device
verification. They are NOT fixed in the JS/TS layer — the real work is native.
This doc captures the exact steps so the next developer with a macOS/Xcode +
Android SDK environment can complete them.

---

## SSL Pinning (Bug 18h) — DEFERRED until custom-domain migration

### Decision
**Not implementing SSL pinning while the API runs on `*.onrender.com`.**

### Why

Render uses Google Trust Services and rotates leaf certificates every
60–90 days unilaterally. If we pin to a certificate under Render's control,
any automated cert rotation brick-locks the entire mobile user base until
they install a new app build (days on iOS via Apple review, hours on
Android). The risk of locking out real users exceeds the benefit of
defending against a targeted MITM on a specifically-compromised WiFi.

### Compensating controls already in place
- Session access tokens expire in 15 minutes (`JWT_ACCESS_TTL=900`).
- Refresh tokens rotate CAS-atomically on every use (Bug #2 fix).
- Account lockout after 10 failed logins (`LoginAttemptTracker`).
- HTTPS still enforced by the OS; a true MITM requires a malicious root CA
  already installed on the victim's device.

### Trigger to implement

Add pinning as part of the **custom-domain cutover release** — the same
release that points the mobile app at `api.playconnect.in` (or whatever
final domain). At that point:

1. Issue your own cert. Let's Encrypt (cert-manager / certbot with
   stable-key renewal) is fine; or pay a commercial CA for multi-year.
2. Pin the **intermediate CA public key**, not the leaf:

   ```bash
   echo | openssl s_client -servername api.playconnect.in -connect api.playconnect.in:443 -showcerts 2>/dev/null \
     | awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' \
     | openssl x509 -pubkey -noout \
     | openssl pkey -pubin -outform der 2>/dev/null \
     | openssl dgst -sha256 -binary \
     | openssl enc -base64
   ```

   Walk the chain and capture the intermediate's public-key hash (second
   cert in the chain, usually labelled "R10", "R11", or the CA's SKU).

3. Use **platform-level pinning** via native config, NOT a JS library.
   This pins ALL app traffic including any native modules (Firebase,
   Cashfree SDK) without requiring fetch rewrites:

   - **Android**: `android/app/src/main/res/xml/network_security_config.xml`
     with `<pin-set><pin digest="SHA-256">HASH=</pin></pin-set>` per
     pinned domain. Reference it from `AndroidManifest.xml`
     `android:networkSecurityConfig="@xml/network_security_config"`.
   - **iOS**: `Info.plist`
     `NSAppTransportSecurity > NSPinnedDomains > api.playconnect.in >
     NSPinnedCAIdentities` with the base64 hash.

4. **Only enable in release builds**. Dev/staging must be unpinned so
   localhost + Render staging work.
5. Test: MITM proxy (mitmproxy) against a release build → should fail
   the TLS handshake. Against production → should succeed.
6. Cert rotation procedure: Let's Encrypt intermediate rotates every
   2–5 years with months of warning. Ship a mobile update including both
   old + new hash **before** the rotation flips. Keep both pins active
   for at least one release cycle.

### Reference hashes (current `*.onrender.com` chain — informational only)

At the time this doc was written, the production API cert chain was:

- Leaf (`onrender.com`): `T4eoRdbfIYF3G9IOGamqR3Vgye2bNLHQTSCOY8u3y5w=` (rotates)
- Intermediate (Google Trust Services `WE1`): `kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=` (stable years)
- Root (`GTS Root R4`): `mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c=` (stable decade)

**Do not pin these hashes now.** They're useful only if a decision is ever
made to pin the current Render-hosted setup before custom-domain migration,
which is specifically NOT the recommendation.

---

## Cashfree Native SDK (Bug 18i)

### Current state
`apps/mobile/src/infra/payments/cashfree-web-checkout.ts`:

- **Web**: loads the Cashfree JS SDK from npm or CDN → modal checkout. Works.
- **Native (iOS + Android)**: falls back to `Linking.openURL(checkoutUrl)`,
  which boots the user into an external browser. Poor UX; some payment flows
  (UPI intent redirects, in-app Netbanking) don't round-trip back to the app
  cleanly from an external browser.

The file comment at line 24 acknowledges this:
> `// Note: For production native apps, integrate react-native-cashfree-pg-sdk`

### Recommended library
[`react-native-cashfree-pg-sdk`](https://github.com/cashfree/cashfree-pg-api-contract)
— official Cashfree SDK. Provides a native-rendered checkout sheet and
callbacks for success/failure/verification states that complete inside the
app without external browser hops.

### Steps

**1. Install**
```bash
cd apps/mobile
npm install react-native-cashfree-pg-sdk
cd ios && pod install && cd ..
```

**2. iOS native config (`ios/Podfile`)**
The SDK's podspec declares a minimum iOS version. Verify `platform :ios,
'13.0'` or newer in the Podfile. Re-run `pod install` after editing.

**3. Android native config (`android/app/build.gradle`)**
Add any required `packagingOptions` + `minSdkVersion` — consult the SDK
README at install time. Usually no changes needed if `minSdkVersion` ≥ 21.

**4. Replace the native branch in `cashfree-web-checkout.ts`**
Wire the library's `CFPaymentGatewayService.doPayment(...)` behind the
existing `Platform.OS !== 'web'` branch. The function must:
- Pass `paymentSessionId`, mode (`sandbox` | `production`), `orderId`.
- Return a promise that resolves when the user completes or dismisses the
  sheet.
- Register verification callback so the app can refresh the local
  `FeePayment.status` after completion (parallel to the current polling).

**5. Keep the polling safety net**
Even with the native SDK, server-side polling at
`use-fee-payment-flow.ts:54–98` should stay. The SDK callback can be
unreliable on kill-while-paying edge cases; the poll is the source of truth.

**6. Remove the now-orphan `Linking` fallback**
Once the SDK is wired and tested, delete the `Linking.openURL(checkoutUrl)`
branch — leaving it creates two paths with different semantics.

**7. Verification (real devices only)**
- Sandbox mode: complete a test payment with a sandbox UPI / card on a real
  phone (iOS and Android separately).
- Kill-app mid-payment, reopen — verify the server-side poll catches up and
  shows the correct final status.
- Network drop mid-payment — verify behavior matches design.

### Dependency on Bug 18h
SSL pinning affects the Cashfree SDK's internal network calls too. Coordinate
rollout: pin both PlayConnect API and Cashfree's public API hashes, OR scope
the pinning allowlist to our own domain only and let the Cashfree SDK use
plain TLS.

---

## Why this is a separate doc, not a code change

Both fixes require:
1. Real iOS simulator / Xcode environment for `pod install` and verification.
2. Real Android SDK + emulator / device for Gradle + runtime verification.
3. A Cashfree sandbox account for test-payment verification.
4. Ops coordination for cert hashes (18h) and SDK API keys (18i).

Shipping untested native config changes risks breaking the mobile build for
everyone. The JS-layer changes that could be staged in isolation are already
in place (the pluggable structure in `cashfree-web-checkout.ts` and the
pluggable `ErrorReporter` in `AppErrorBoundary.tsx`). The native work is what
remains.
