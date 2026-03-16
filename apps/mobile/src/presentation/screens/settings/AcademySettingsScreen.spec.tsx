import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AcademySettingsScreen } from './AcademySettingsScreen';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextValue, AuthPhase } from '../../context/AuthContext';
import * as settingsApiModule from '../../../infra/settings/settings-api';
import { ok, err } from '../../../domain/common/result';

jest.mock('../../../infra/settings/settings-api', () => ({
  settingsApi: {
    getAcademySettings: jest.fn(),
    updateAcademySettings: jest.fn(),
  },
}));

const mockSettingsApi = settingsApiModule.settingsApi as {
  getAcademySettings: jest.Mock;
  updateAcademySettings: jest.Mock;
};

function makeAuth(role: 'OWNER' | 'STAFF' = 'OWNER'): AuthContextValue {
  return {
    phase: 'ready' as AuthPhase,
    user: {
      id: 'u1',
      fullName: 'Test User',
      email: 'test@test.com',
      phoneNumber: '+919876543210',
      role,
      status: 'ACTIVE',
    },
    subscription: null,
    login: jest.fn().mockResolvedValue(null),
    signup: jest.fn().mockResolvedValue(null),
    setupAcademy: jest.fn().mockResolvedValue(null),
    logout: jest.fn(),
    refreshSubscription: jest.fn(),
    forceUpdate: null,
  };
}

function renderScreen(role: 'OWNER' | 'STAFF' = 'OWNER') {
  const auth = makeAuth(role);
  return render(
    <AuthContext.Provider value={auth}>
      <AcademySettingsScreen />
    </AuthContext.Provider>,
  );
}

describe('AcademySettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockSettingsApi.getAcademySettings.mockReturnValue(new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('settings-loading')).toBeTruthy();
  });

  it('shows settings form on success', async () => {
    mockSettingsApi.getAcademySettings.mockResolvedValue(
      ok({ defaultDueDateDay: 5, receiptPrefix: 'PC', lateFeeEnabled: false, gracePeriodDays: 0, lateFeeAmountInr: 0, lateFeeRepeatIntervalDays: 0 }),
    );

    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('settings-form')).toBeTruthy();
    });

    expect(screen.getByTestId('input-receipt-prefix').props.value).toBe('PC');
    expect(screen.getByTestId('input-due-date-day').props.value).toBe('5');
  });

  it('shows error with retry on API failure', async () => {
    mockSettingsApi.getAcademySettings.mockResolvedValue(
      err({ code: 'NETWORK', message: 'Network error' }),
    );

    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('settings-error')).toBeTruthy();
    });

    expect(screen.getByText('Network error')).toBeTruthy();
    expect(screen.getByTestId('settings-retry')).toBeTruthy();
  });

  it('shows editable form for OWNER', async () => {
    mockSettingsApi.getAcademySettings.mockResolvedValue(
      ok({ defaultDueDateDay: 5, receiptPrefix: 'PC', lateFeeEnabled: false, gracePeriodDays: 0, lateFeeAmountInr: 0, lateFeeRepeatIntervalDays: 0 }),
    );

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('settings-form')).toBeTruthy();
    });

    expect(screen.getByTestId('settings-save-btn')).toBeTruthy();
    expect(screen.queryByTestId('read-only-note')).toBeNull();
  });

  it('shows read-only form for STAFF', async () => {
    mockSettingsApi.getAcademySettings.mockResolvedValue(
      ok({ defaultDueDateDay: 5, receiptPrefix: 'PC', lateFeeEnabled: false, gracePeriodDays: 0, lateFeeAmountInr: 0, lateFeeRepeatIntervalDays: 0 }),
    );

    renderScreen('STAFF');

    await waitFor(() => {
      expect(screen.getByTestId('settings-form')).toBeTruthy();
    });

    expect(screen.queryByTestId('settings-save-btn')).toBeNull();
    expect(screen.getByTestId('read-only-note')).toBeTruthy();
    expect(screen.getByText('Only the academy owner can edit settings.')).toBeTruthy();
  });

  it('enables save button when values change', async () => {
    mockSettingsApi.getAcademySettings.mockResolvedValue(
      ok({ defaultDueDateDay: 5, receiptPrefix: 'PC', lateFeeEnabled: false, gracePeriodDays: 0, lateFeeAmountInr: 0, lateFeeRepeatIntervalDays: 0 }),
    );

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('settings-form')).toBeTruthy();
    });

    const saveBtn = screen.getByTestId('settings-save-btn');
    expect(
      saveBtn.props.accessibilityState?.disabled ?? saveBtn.props.disabled,
    ).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('input-receipt-prefix'), 'INV');

    const saveBtnAfter = screen.getByTestId('settings-save-btn');
    expect(
      saveBtnAfter.props.accessibilityState?.disabled ?? saveBtnAfter.props.disabled,
    ).toBeFalsy();
  });

  it('shows validation error for invalid due date day', async () => {
    mockSettingsApi.getAcademySettings.mockResolvedValue(
      ok({ defaultDueDateDay: 5, receiptPrefix: 'PC', lateFeeEnabled: false, gracePeriodDays: 0, lateFeeAmountInr: 0, lateFeeRepeatIntervalDays: 0 }),
    );

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('settings-form')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('input-due-date-day'), '30');

    expect(screen.getByTestId('day-error')).toBeTruthy();
    expect(screen.getByText('Must be 1\u201328')).toBeTruthy();
  });
});
