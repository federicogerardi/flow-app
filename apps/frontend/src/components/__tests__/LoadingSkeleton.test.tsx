import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSkeleton } from '../LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<LoadingSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });
});
