import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuditLogsScreen } from './AuditLogsScreen';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextValue, AuthPhase } from '../../context/AuthContext';
import * as auditApiModule from '../../../infra/audit/audit-api';
import { ok, err } from '../../../domain/common/result';

jest.mock('../../../infra/audit/audit-api', () => ({
  auditApi: {
    listAuditLogs: jest.fn(),
  },
}));

const mockAuditApi = auditApiModule.auditApi as { listAuditLogs: jest.Mock };

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

function makeLogsResponse(count = 2) {
  const items = Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    academyId: 'academy-1',
    actorUserId: 'user-1',
    actorName: null,
    action: 'STUDENT_CREATED',
    entityType: 'STUDENT',
    entityId: `student-${i}`,
    context: { studentName: `Student ${i}` },
    createdAt: `2026-03-0${i + 1}T10:00:00Z`,
  }));

  return {
    items,
    meta: { page: 1, pageSize: 50, totalItems: count, totalPages: 1 },
  };
}

function renderScreen(role: 'OWNER' | 'STAFF' = 'OWNER') {
  const auth = makeAuth(role);
  return render(
    <AuthContext.Provider value={auth}>
      <AuditLogsScreen />
    </AuthContext.Provider>,
  );
}

describe('AuditLogsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows forbidden message for STAFF', () => {
    renderScreen('STAFF');
    expect(screen.getByTestId('audit-forbidden')).toBeTruthy();
    expect(screen.getByText('Only the owner can view audit logs.')).toBeTruthy();
  });

  it('shows loading state initially for OWNER', () => {
    mockAuditApi.listAuditLogs.mockReturnValue(new Promise(() => {}));
    renderScreen('OWNER');
    expect(screen.getByTestId('audit-loading')).toBeTruthy();
  });

  it('shows audit log rows on success', async () => {
    mockAuditApi.listAuditLogs.mockResolvedValue(ok(makeLogsResponse(2)));

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('audit-list')).toBeTruthy();
    });

    expect(screen.getByTestId('audit-row-log-0')).toBeTruthy();
    expect(screen.getByTestId('audit-row-log-1')).toBeTruthy();
  });

  it('shows empty state when no logs', async () => {
    mockAuditApi.listAuditLogs.mockResolvedValue(ok(makeLogsResponse(0)));

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByText('No audit logs found for the selected filters')).toBeTruthy();
    });
  });

  it('shows error with retry on API failure', async () => {
    mockAuditApi.listAuditLogs.mockResolvedValue(
      err({ code: 'NETWORK', message: 'Network error' }),
    );

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('audit-error')).toBeTruthy();
    });

    expect(screen.getByText('Network error')).toBeTruthy();
    expect(screen.getByTestId('audit-retry')).toBeTruthy();
  });

  it('renders filters panel', async () => {
    mockAuditApi.listAuditLogs.mockResolvedValue(ok(makeLogsResponse(1)));

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('toggle-filters')).toBeTruthy();
    });

    // Filters panel starts hidden; toggle it open
    fireEvent.press(screen.getByTestId('toggle-filters'));

    expect(screen.getByTestId('audit-filters')).toBeTruthy();
    expect(screen.getByTestId('filter-from')).toBeTruthy();
    expect(screen.getByTestId('filter-to')).toBeTruthy();
    expect(screen.getByTestId('filter-apply')).toBeTruthy();
    expect(screen.getByTestId('filter-clear')).toBeTruthy();
  });

  it('can toggle filters visibility', async () => {
    mockAuditApi.listAuditLogs.mockResolvedValue(ok(makeLogsResponse(1)));

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('toggle-filters')).toBeTruthy();
    });

    // Open the filters panel
    fireEvent.press(screen.getByTestId('toggle-filters'));
    expect(screen.getByTestId('audit-filters')).toBeTruthy();

    // Close the filters panel
    fireEvent.press(screen.getByTestId('toggle-filters'));
    expect(screen.queryByTestId('audit-filters')).toBeNull();
  });

  it('shows action label in audit log row', async () => {
    mockAuditApi.listAuditLogs.mockResolvedValue(ok(makeLogsResponse(1)));

    renderScreen('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('audit-row-log-0-action')).toBeTruthy();
    });

    expect(screen.getByText('Student Created')).toBeTruthy();
  });
});
