import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ExportButton } from './ExportButton';
import { ok, err } from '../../../domain/common/result';
import type { PdfExportResult } from '../../../infra/reports/pdf-download';

jest.mock('react-native-share', () => ({
  default: { open: jest.fn(() => Promise.resolve({ success: true })) },
}));

const successResult: PdfExportResult = {
  filePath: '/mock/exports/test.pdf',
  filename: 'playconnect_revenue_2026-03.pdf',
  sizeBytes: 2048,
  createdAt: new Date(),
};

describe('ExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export trigger in idle state', () => {
    const onExport = jest.fn();
    render(<ExportButton onExport={onExport} testID="export" />);

    expect(screen.getByTestId('export-trigger')).toBeTruthy();
    expect(screen.getByText('Export PDF')).toBeTruthy();
  });

  it('shows downloading state when triggered', async () => {
    let resolveExport: (v: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveExport = resolve;
    });
    const onExport = jest.fn().mockReturnValue(pending);

    render(<ExportButton onExport={onExport} testID="export" />);

    fireEvent.press(screen.getByTestId('export-trigger'));

    expect(screen.getByTestId('export-downloading')).toBeTruthy();
    expect(screen.getByText('Downloading PDF...')).toBeTruthy();

    // Resolve to prevent act warning
    resolveExport!(ok(successResult));
    await waitFor(() => {
      expect(screen.getByTestId('export-success')).toBeTruthy();
    });
  });

  it('shows success state with Open and Share actions', async () => {
    const onExport = jest.fn().mockResolvedValue(ok(successResult));

    render(<ExportButton onExport={onExport} testID="export" />);

    fireEvent.press(screen.getByTestId('export-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('export-success')).toBeTruthy();
    });

    expect(screen.getByTestId('export-open')).toBeTruthy();
    expect(screen.getByTestId('export-share')).toBeTruthy();
    expect(screen.getByTestId('export-done')).toBeTruthy();
    expect(screen.getByText(/2 KB/)).toBeTruthy();
  });

  it('shows error state with retry on failure', async () => {
    const onExport = jest.fn().mockResolvedValue(
      err({ code: 'NETWORK', message: 'Network timeout. Please try again.' }),
    );

    render(<ExportButton onExport={onExport} testID="export" />);

    fireEvent.press(screen.getByTestId('export-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeTruthy();
    });

    expect(screen.getByText('Network timeout. Please try again.')).toBeTruthy();
    expect(screen.getByTestId('export-retry')).toBeTruthy();
  });

  it('returns to idle when retry is pressed after error', async () => {
    const onExport = jest.fn().mockResolvedValue(
      err({ code: 'NETWORK', message: 'Network error' }),
    );

    render(<ExportButton onExport={onExport} testID="export" />);

    fireEvent.press(screen.getByTestId('export-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('export-retry'));

    expect(screen.getByTestId('export-trigger')).toBeTruthy();
  });

  it('returns to idle when Done is pressed after success', async () => {
    const onExport = jest.fn().mockResolvedValue(ok(successResult));

    render(<ExportButton onExport={onExport} testID="export" />);

    fireEvent.press(screen.getByTestId('export-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('export-success')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('export-done'));

    expect(screen.getByTestId('export-trigger')).toBeTruthy();
  });
});
