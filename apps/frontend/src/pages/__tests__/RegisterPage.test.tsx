import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RegisterPage from '../RegisterPage';
import { useAuth } from '../../auth/AuthContext';

const mockRegister = vi.fn();
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

vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

function getEmailInput() {
  return screen.getByRole('textbox', { name: /email/i });
}

function getPasswordInputs() {
  return document.querySelectorAll('input[type="password"]');
}

function renderRegisterPage() {
  vi.mocked(useAuth).mockReturnValue({
    register: mockRegister,
    isAuthenticated: false,
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form with email, password, confirm password fields and submit button', () => {
    renderRegisterPage();

    expect(getEmailInput()).toBeDefined();
    const passwords = getPasswordInputs();
    expect(passwords).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'auth.register.submit' })).toBeDefined();
  });

  it('renders the page title', () => {
    renderRegisterPage();

    expect(screen.getByText('auth.register.title')).toBeDefined();
  });

  it('renders link to login page', () => {
    renderRegisterPage();

    expect(screen.getByText('auth.register.signIn')).toBeDefined();
  });

  it('shows password helper text', () => {
    renderRegisterPage();

    expect(screen.getByText('auth.register.helperText')).toBeDefined();
  });

  it('disables submit button when fields are empty', () => {
    renderRegisterPage();

    const button = screen.getByRole('button', { name: 'auth.register.submit' });
    expect(button).toBeDisabled();
  });

  it('enables submit button when all fields are filled', async () => {
    renderRegisterPage();

    const passwords = getPasswordInputs();

    fireEvent.change(getEmailInput(), { target: { value: 'user@example.com' } });
    fireEvent.change(passwords[0], { target: { value: 'password123' } });
    fireEvent.change(passwords[1], { target: { value: 'password123' } });

    const button = screen.getByRole('button', { name: 'auth.register.submit' });
    expect(button).not.toBeDisabled();
  });

  it('shows error when password is less than 8 characters', async () => {
    renderRegisterPage();

    const passwords = getPasswordInputs();

    fireEvent.change(getEmailInput(), { target: { value: 'user@example.com' } });
    fireEvent.change(passwords[0], { target: { value: 'short' } });
    fireEvent.change(passwords[1], { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.register.submit' }));

    await waitFor(() => {
      expect(screen.getByText('auth.register.passwordTooShort')).toBeDefined();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    renderRegisterPage();

    const passwords = getPasswordInputs();

    fireEvent.change(getEmailInput(), { target: { value: 'user@example.com' } });
    fireEvent.change(passwords[0], { target: { value: 'password123' } });
    fireEvent.change(passwords[1], { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.register.submit' }));

    await waitFor(() => {
      expect(screen.getByText('auth.register.passwordMismatch')).toBeDefined();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls register on valid form submit', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    renderRegisterPage();

    const passwords = getPasswordInputs();

    fireEvent.change(getEmailInput(), { target: { value: 'user@example.com' } });
    fireEvent.change(passwords[0], { target: { value: 'password123' } });
    fireEvent.change(passwords[1], { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.register.submit' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows error message on registration failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Email already in use'));

    renderRegisterPage();

    const passwords = getPasswordInputs();

    fireEvent.change(getEmailInput(), { target: { value: 'user@example.com' } });
    fireEvent.change(passwords[0], { target: { value: 'password123' } });
    fireEvent.change(passwords[1], { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.register.submit' }));

    // Error message comes from err.message, not copy — it's runtime data
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeDefined();
    });
  });
});