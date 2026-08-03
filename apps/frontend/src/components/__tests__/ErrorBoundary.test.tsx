import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

function ThrowError({ msg }: { msg: string }): React.ReactElement {
  throw new Error(msg);
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <p>Hello world</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('catches thrown error and shows error UI', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError msg="Kaboom!" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Kaboom!')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('try again button exists and can be clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError msg="Kaboom!" />
      </ErrorBoundary>,
    );

    const tryAgain = screen.getByRole('button', { name: 'Try again' });
    expect(tryAgain).toBeInTheDocument();

    // Clicking "Try again" re-renders children, which throw again,
    // so the boundary catches the error again. The button must still exist.
    fireEvent.click(tryAgain);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    spy.mockRestore();
  });
});
