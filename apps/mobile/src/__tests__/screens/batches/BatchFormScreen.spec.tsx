import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: { mode: 'create' } }),
}));

jest.mock('../../../infra/batch/batch-api', () => ({
  createBatch: jest.fn(),
  updateBatch: jest.fn(),
}));

import { createBatch } from '../../../infra/batch/batch-api';
import { BatchFormScreen } from '../../../presentation/screens/batches/BatchFormScreen';

const mockCreateBatch = createBatch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BatchFormScreen', () => {
  it('renders form fields', () => {
    render(<BatchFormScreen />);
    expect(screen.getByTestId('input-batchName')).toBeTruthy();
    expect(screen.getByTestId('day-mon')).toBeTruthy();
    expect(screen.getByTestId('submit-button')).toBeTruthy();
  });

  it('shows validation error for empty batch name', async () => {
    render(<BatchFormScreen />);
    fireEvent.press(screen.getByTestId('submit-button'));
    expect(await screen.findByText('Batch name is required')).toBeTruthy();
  });

  it('submits form without days and navigates back on success', async () => {
    mockCreateBatch.mockResolvedValue({ ok: true, value: { id: 'b1' } });

    render(<BatchFormScreen />);

    fireEvent.changeText(screen.getByTestId('input-batchName'), 'Morning Batch');

    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('submit-button'));
    });

    await waitFor(() => {
      expect(mockCreateBatch).toHaveBeenCalledWith({
        batchName: 'Morning Batch',
        days: undefined,
        notes: null,
      });
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('submits form with days and navigates back on success', async () => {
    mockCreateBatch.mockResolvedValue({ ok: true, value: { id: 'b1' } });

    render(<BatchFormScreen />);

    fireEvent.changeText(screen.getByTestId('input-batchName'), 'Morning Batch');
    fireEvent.press(screen.getByTestId('day-mon'));
    fireEvent.press(screen.getByTestId('day-wed'));

    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('submit-button'));
    });

    await waitFor(() => {
      expect(mockCreateBatch).toHaveBeenCalledWith({
        batchName: 'Morning Batch',
        days: ['MON', 'WED'],
        notes: null,
      });
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('shows server error on API failure', async () => {
    mockCreateBatch.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'Batch name already exists' },
    });

    render(<BatchFormScreen />);

    fireEvent.changeText(screen.getByTestId('input-batchName'), 'Morning Batch');

    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('submit-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('Batch name already exists')).toBeTruthy();
    });
  });
});
