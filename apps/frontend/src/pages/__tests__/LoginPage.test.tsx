import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LoginPage from '../LoginPage';
import { useAuth } from '../../auth/AuthContext';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../auth/AuthContext', () => ({
  useAuth: vi.fn(),
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

function renderLoginPage(isAuthenticated = false) {
  vi.mocked(useAuth).mockReturnValue({
    login: mockLogin,
    isAuthenticated,
    user: isAuthenticated ? { id: 'user-1', email: 'test@example.com', role: 'member' } : null,
    isLoading: false,
    register: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email, password fields and submit button', () => {
    renderLoginPage();

    expect(screen.getByRole('textbox', { name: /email/i })).toBeDefined();

    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeDefined();

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined();
  });

  it('renders Google sign-in button', () => {
    renderLoginPage();

    expect(screen.getByRole('button', { name: /Sign in with Google/i })).toBeDefined();
  });

  it('renders link to register page', () => {
    renderLoginPage();

    expect(screen.getByText('Sign up')).toBeDefined();
  });

  it('renders the page title', () => {
    renderLoginPage();

    expect(screen.getByText('Sign in to your account')).toBeDefined();
  });

  it('disables submit button when email and password are empty', () => {
    renderLoginPage();

    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();
  });

  it('enables submit button when email and password are filled', async () => {
    renderLoginPage();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).not.toBeDisabled();
  });

  it('calls login on form submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    renderLoginPage();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderLoginPage();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
    });
  });

  it('redirects to /dashboard when already authenticated', () => {
    renderLoginPage(true);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('returns null when already authenticated', () => {
    const { container } = renderLoginPage(true);

    expect(container.innerHTML).toBe('');
  });
});
