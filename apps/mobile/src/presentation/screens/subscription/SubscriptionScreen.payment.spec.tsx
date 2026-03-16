import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextValue, AuthPhase } from '../../context/AuthContext';
import type { SubscriptionInfo } from '../../../domain/subscription/subscription.types';
import { SubscriptionScreen } from './SubscriptionScreen';

// Mock payment flow hook
const mockStartPayment = jest.fn();
const mockReset = jest.fn();
import type { PaymentFlowStatus } from '../../../domain/payments/cashfree.types';

let mockPaymentFlow = {
  status: 'idle' as PaymentFlowStatus,
  error: null as string | null,
  orderId: null as string | null,
  paymentResult: null,
  startPayment: mockStartPayment,
  reset: mockReset,
};

jest.mock('../../../application/subscription/use-payment-flow', () => ({
  usePaymentFlow: () => mockPaymentFlow,
}));

const TIERS = [
  { tierKey: 'TIER_0_50' as const, min: 0, max: 50, priceInr: 299 },
  { tierKey: 'TIER_51_100' as const, min: 51, max: 100, priceInr: 499 },
  { tierKey: 'TIER_101_PLUS' as const, min: 101, max: null, priceInr: 699 },
];

function makeSub(overrides: Partial<SubscriptionInfo> = {}): SubscriptionInfo {
  return {
    status: 'TRIAL',
    trialEndAt: '2026-04-01T00:00:00Z',
    paidEndAt: null,
    tierKey: null,
    daysRemaining: 28,
    canAccessApp: true,
    blockReason: null,
    activeStudentCount: 15,
    currentTierKey: null,
    requiredTierKey: 'TIER_0_50',
    pendingTierChange: null,
    tiers: TIERS,
    ...overrides,
  };
}

function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    phase: 'ready' as AuthPhase,
    user: {
      id: 'u1',
      fullName: 'Owner',
      email: 'o@test.com',
      phoneNumber: '+919876543210',
      role: 'OWNER',
      status: 'ACTIVE',
    },
    subscription: makeSub(),
    login: jest.fn().mockResolvedValue(null),
    signup: jest.fn().mockResolvedValue(null),
    setupAcademy: jest.fn().mockResolvedValue(null),
    logout: jest.fn(),
    refreshSubscription: jest.fn(),
    forceUpdate: null,
    ...overrides,
  };
}

function renderScreen(auth: AuthContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <SubscriptionScreen />
    </AuthContext.Provider>,
  );
}

describe('SubscriptionScreen — Payment Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentFlow = {
      status: 'idle',
      error: null,
      orderId: null,
      paymentResult: null,
      startPayment: mockStartPayment,
      reset: mockReset,
    };
  });

  // ── Pay button visibility ──

  it('shows pay button for OWNER in TRIAL status', () => {
    renderScreen(makeAuth());
    expect(screen.getByTestId('pay-cashfree-button')).toBeTruthy();
  });

  it('shows pay button for OWNER in EXPIRED_GRACE status', () => {
    renderScreen(
      makeAuth({
        subscription: makeSub({ status: 'EXPIRED_GRACE', daysRemaining: 3 }),
      }),
    );
    expect(screen.getByTestId('pay-cashfree-button')).toBeTruthy();
  });

  it('shows pay button for OWNER in BLOCKED status', () => {
    renderScreen(
      makeAuth({
        subscription: makeSub({
          status: 'BLOCKED',
          canAccessApp: false,
          daysRemaining: 0,
        }),
      }),
    );
    expect(screen.getByTestId('pay-cashfree-button')).toBeTruthy();
  });

  it('hides pay button when ACTIVE_PAID', () => {
    renderScreen(
      makeAuth({
        subscription: makeSub({
          status: 'ACTIVE_PAID',
          currentTierKey: 'TIER_0_50',
          paidEndAt: '2026-05-01T00:00:00Z',
        }),
      }),
    );
    expect(screen.queryByTestId('pay-cashfree-button')).toBeNull();
    expect(screen.queryByTestId('pay-cashfree-section')).toBeNull();
  });

  it('hides pay button when DISABLED', () => {
    renderScreen(
      makeAuth({
        subscription: makeSub({
          status: 'DISABLED',
          canAccessApp: false,
          daysRemaining: 0,
        }),
      }),
    );
    expect(screen.queryByTestId('pay-cashfree-button')).toBeNull();
    expect(screen.queryByTestId('pay-cashfree-section')).toBeNull();
  });

  it('hides pay button for STAFF role', () => {
    renderScreen(
      makeAuth({
        user: {
          id: 'u2',
          fullName: 'Staff',
          email: 's@test.com',
          phoneNumber: '+919876543211',
          role: 'STAFF',
          status: 'ACTIVE',
        },
      }),
    );
    expect(screen.queryByTestId('pay-cashfree-button')).toBeNull();
    expect(screen.queryByTestId('pay-cashfree-section')).toBeNull();
  });

  // ── Pay button label ──

  it('shows correct tier and amount on pay button label', () => {
    renderScreen(makeAuth());
    const section = within(screen.getByTestId('pay-cashfree-section'));
    expect(section.getByText(/0–50 students/)).toBeTruthy();
    expect(section.getByText(/₹299\/month/)).toBeTruthy();
  });

  // ── Pay button interaction ──

  it('calls startPayment on pay button press', () => {
    renderScreen(makeAuth());
    fireEvent.press(screen.getByTestId('pay-cashfree-button'));
    expect(mockStartPayment).toHaveBeenCalledTimes(1);
  });

  // ── Payment status banner ──

  it('hides payment status banner when idle', () => {
    renderScreen(makeAuth());
    expect(screen.queryByTestId('payment-status-banner')).toBeNull();
  });

  it('shows initiating banner', () => {
    mockPaymentFlow = { ...mockPaymentFlow, status: 'initiating' };
    renderScreen(makeAuth());
    expect(screen.getByTestId('payment-status-banner')).toBeTruthy();
    expect(screen.getByText('Initiating payment...')).toBeTruthy();
  });

  it('shows polling banner', () => {
    mockPaymentFlow = { ...mockPaymentFlow, status: 'polling' };
    renderScreen(makeAuth());
    expect(screen.getByTestId('payment-status-banner')).toBeTruthy();
    expect(screen.getByText('Verifying payment...')).toBeTruthy();
  });

  it('shows success banner and hides pay button', () => {
    mockPaymentFlow = { ...mockPaymentFlow, status: 'success' };
    renderScreen(makeAuth());
    expect(screen.getByTestId('payment-status-banner')).toBeTruthy();
    expect(screen.getByText('Subscription activated!')).toBeTruthy();
    // PayWithCashfreeButton returns null on success
    expect(screen.queryByTestId('pay-cashfree-button')).toBeNull();
  });

  it('shows failed banner with error and retry button', () => {
    mockPaymentFlow = {
      ...mockPaymentFlow,
      status: 'failed',
      error: 'Payment already in progress',
    };
    renderScreen(makeAuth());
    expect(screen.getByTestId('payment-status-banner')).toBeTruthy();
    expect(screen.getByText('Payment already in progress')).toBeTruthy();
    expect(screen.getByTestId('pay-retry-button')).toBeTruthy();
  });

  it('calls reset on retry button press', () => {
    mockPaymentFlow = {
      ...mockPaymentFlow,
      status: 'failed',
      error: 'Payment failed',
    };
    renderScreen(makeAuth());
    fireEvent.press(screen.getByTestId('pay-retry-button'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  // ── Pay button disabled during loading ──

  it('disables pay button during initiating', () => {
    mockPaymentFlow = { ...mockPaymentFlow, status: 'initiating' };
    renderScreen(makeAuth());
    // The PayWithCashfreeButton shows the button as disabled+loading during initiating
    const button = screen.getByTestId('pay-cashfree-button');
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBeTruthy();
  });
});
