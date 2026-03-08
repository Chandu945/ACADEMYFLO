import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppError } from '@/domain/common/errors';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth service
const mockLogin = jest.fn();
jest.mock('@/application/auth/admin-auth.service', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
}));

// Must import after mocks
import LoginPage from './page';

describe('LoginPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows validation error for empty email', async () => {
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    });
  });

  it('shows validation error for empty password', async () => {
    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'admin@test.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('calls login service on valid submit', async () => {
    mockLogin.mockResolvedValue({
      accessToken: 'tok',
      user: { id: '1', email: 'a@b.com', fullName: 'Admin', role: 'SUPER_ADMIN' },
      deviceId: 'dev1',
    });

    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'admin@test.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'secret123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error alert on failure', async () => {
    mockLogin.mockRejectedValue(AppError.unauthorized('Invalid credentials'));

    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'admin@test.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });
});
