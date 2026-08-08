import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from '../AuthLayout';

vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

describe('AuthLayout', () => {
  it('renders brand app name from copy', () => {
    render(
      <AuthLayout title="Sign in">
        <p>Form content</p>
      </AuthLayout>,
    );

    expect(screen.getByText('shared.brand.appName')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(
      <AuthLayout title="Sign in">
        <p>Form content</p>
      </AuthLayout>,
    );

    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('renders children inside card', () => {
    render(
      <AuthLayout title="Sign in">
        <p>Form content</p>
      </AuthLayout>,
    );

    expect(screen.getByText('Form content')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <AuthLayout title="Sign in" footer={<a href="/register">Register</a>}>
        <p>Form content</p>
      </AuthLayout>,
    );

    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });
});