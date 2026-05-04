// Web stub for react-native-cashfree-pg-sdk.
// The native SDK is only invoked when Platform.OS !== 'web' (see
// src/infra/payments/cashfree-web-checkout.ts — the web branch uses the
// Cashfree JS SDK loaded from CDN). On web these symbols are imported but
// never called, so the stub just needs to satisfy the import shape.
const noop = () => {};

const CFPaymentGatewayService = {
  setCallback: noop,
  doPayment: noop,
  removeCallback: noop,
};

module.exports = { CFPaymentGatewayService };
module.exports.default = module.exports;
