import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from '../AuthLayout';

describe('AuthLayout', () => {
  it('renders logo text "flow app"', () => {
    render(
      <AuthLayout title="Sign in">
        <p>Form content</p>
      </AuthLayout>,
    );

    expect(screen.getByText('flow app')).toBeInTheDocument();
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
