import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StudentFormScreen } from './StudentFormScreen';
import * as studentApi from '../../../infra/student/student-api';
import * as navModule from '@react-navigation/native';
import * as authModule from '../../context/AuthContext';
import { ok, err } from '../../../domain/common/result';

jest.mock('../../../infra/student/student-api', () => ({
  createStudent: jest.fn(),
  updateStudent: jest.fn(),
  deleteStudent: jest.fn(),
  getStudentPhotoUploadPath: jest.fn((id: string) => `/api/v1/students/${id}/photo`),
}));

jest.mock('../../../infra/batch/batch-api', () => ({
  getStudentBatches: jest.fn().mockResolvedValue({ ok: true, value: [] }),
  setStudentBatches: jest.fn().mockResolvedValue({ ok: true, value: null }),
  listBatches: jest.fn().mockResolvedValue({ ok: true, value: { items: [], total: 0 } }),
}));

jest.mock('../../components/common/ProfilePhotoUploader', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProfilePhotoUploader: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: props['testID'] }),
  };
});

jest.mock('../../components/batches/BatchMultiSelect', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BatchMultiSelect: () => React.createElement(View, { testID: 'batch-multi-select' }),
  };
});

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseRoute = navModule.useRoute as jest.Mock;
const mockUseAuth = authModule.useAuth as jest.Mock;
const mockCreateStudent = studentApi.createStudent as jest.Mock;

function makeStudent() {
  return {
    id: 's1',
    academyId: 'a1',
    fullName: 'Test Student',
    dateOfBirth: '2010-01-01',
    gender: 'MALE' as const,
    address: {
      line1: '123 St',
      line2: null,
      city: 'Mumbai',
      state: 'MH',
      pincode: '400001',
    },
    guardian: { name: 'Parent', mobile: '+919876543210', email: 'p@test.com' },
    joiningDate: '2024-01-01',
    monthlyFee: 500,
    mobileNumber: null,
    email: null,
    status: 'ACTIVE' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('StudentFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'OWNER' } });
  });

  it('shows all fields including monthlyFee in create mode for both roles', () => {
    mockUseRoute.mockReturnValue({ params: { mode: 'create' } });

    render(<StudentFormScreen />);

    expect(screen.getByTestId('input-fullName')).toBeTruthy();
    expect(screen.getByTestId('input-monthlyFee')).toBeTruthy();
  });

  it('hides monthlyFee for staff in edit mode', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'STAFF' } });
    mockUseRoute.mockReturnValue({
      params: { mode: 'edit', student: makeStudent() },
    });

    render(<StudentFormScreen />);

    expect(screen.getByTestId('input-fullName')).toBeTruthy();
    expect(screen.queryByTestId('input-monthlyFee')).toBeNull();
  });

  it('shows monthlyFee for owner in edit mode', () => {
    mockUseRoute.mockReturnValue({
      params: { mode: 'edit', student: makeStudent() },
    });

    render(<StudentFormScreen />);

    expect(screen.getByTestId('input-monthlyFee')).toBeTruthy();
  });

  it('shows monthlyFee for staff in create mode', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'STAFF' } });
    mockUseRoute.mockReturnValue({ params: { mode: 'create' } });

    render(<StudentFormScreen />);

    expect(screen.getByTestId('input-monthlyFee')).toBeTruthy();
  });

  it('shows validation errors on empty submit', async () => {
    mockUseRoute.mockReturnValue({ params: { mode: 'create' } });

    render(<StudentFormScreen />);

    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeTruthy();
      expect(screen.getByText('Gender is required')).toBeTruthy();
    });
  });

  it('shows server error on API failure', async () => {
    mockUseRoute.mockReturnValue({ params: { mode: 'create' } });
    mockCreateStudent.mockResolvedValue(
      err({ code: 'VALIDATION', message: 'Server validation failed' }),
    );

    render(<StudentFormScreen />);

    // Fill all required fields
    fireEvent.changeText(screen.getByTestId('input-fullName'), 'Test');
    fireEvent.changeText(screen.getByTestId('input-dateOfBirth'), '2010-01-01');
    fireEvent.press(screen.getByTestId('gender-male'));
    fireEvent.changeText(screen.getByTestId('input-guardianName'), 'Parent');
    fireEvent.changeText(screen.getByTestId('input-guardianMobile'), '+919876543210');
    fireEvent.changeText(screen.getByTestId('input-guardianEmail'), 'p@test.com');
    fireEvent.changeText(screen.getByTestId('input-joiningDate'), '2024-01-01');
    fireEvent.changeText(screen.getByTestId('input-monthlyFee'), '500');

    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Server validation failed')).toBeTruthy();
    });
  });

  it('calls goBack on successful submit', async () => {
    mockUseRoute.mockReturnValue({ params: { mode: 'create' } });
    mockCreateStudent.mockResolvedValue(ok({ id: 's-new' }));

    render(<StudentFormScreen />);

    fireEvent.changeText(screen.getByTestId('input-fullName'), 'New Student');
    fireEvent.changeText(screen.getByTestId('input-dateOfBirth'), '2010-01-01');
    fireEvent.press(screen.getByTestId('gender-male'));
    fireEvent.changeText(screen.getByTestId('input-guardianName'), 'Parent');
    fireEvent.changeText(screen.getByTestId('input-guardianMobile'), '+919876543210');
    fireEvent.changeText(screen.getByTestId('input-guardianEmail'), 'p@test.com');
    fireEvent.changeText(screen.getByTestId('input-joiningDate'), '2024-01-01');
    fireEvent.changeText(screen.getByTestId('input-monthlyFee'), '500');

    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
