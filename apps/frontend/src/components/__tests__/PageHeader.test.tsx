import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PageHeader } from '../PageHeader';

// Mock useBreadcrumbs to return controlled crumbs
vi.mock('../../layout/AppShell', () => ({
  useBreadcrumbs: vi.fn(() => ({ crumbs: [] })),
}));

import { useBreadcrumbs } from '../../layout/AppShell';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PageHeader', () => {
  it('renders title', () => {
    renderWithRouter(<PageHeader title="Dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    renderWithRouter(<PageHeader title="Dashboard" subtitle="Overview of your workspaces" />);

    expect(screen.getByText('Overview of your workspaces')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    renderWithRouter(
      <PageHeader title="Dashboard" action={{ label: 'New workspace', onClick: vi.fn() }} />,
    );

    expect(screen.getByRole('button', { name: 'New workspace' })).toBeInTheDocument();
  });

  it('breadcrumbs render from context', () => {
    vi.mocked(useBreadcrumbs).mockReturnValue({
      crumbs: [
        { label: 'Home', path: '/' },
        { label: 'Dashboard' },
      ],
      setBreadcrumbs: vi.fn(),
    });

    renderWithRouter(<PageHeader title="Dashboard" />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard')).toHaveLength(2);
  });

  it('action button click calls onClick', () => {
    const onClick = vi.fn();
    renderWithRouter(
      <PageHeader title="Dashboard" action={{ label: 'New workspace', onClick }} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
