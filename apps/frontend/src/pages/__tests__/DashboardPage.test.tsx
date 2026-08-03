import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import DashboardPage from '../DashboardPage';

const { mockSwr, mockNavigate } = vi.hoisted(() => ({
  mockSwr: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('swr', () => ({
  default: mockSwr,
}));

vi.mock('@flow-app/copy', () => ({
  copy: {
    t: (key: string) => key,
  },
}));

function renderDashboard(workspaceId: string) {
  return render(
    <MemoryRouter initialEntries={[`/workspaces/${workspaceId}`]}>
      <Routes>
        <Route path="/workspaces/:workspaceId" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockSwrReturns(responses: Record<string, unknown>) {
  mockSwr.mockImplementation((key: string) => {
    if (key in responses) return responses[key];
    return { data: undefined, isLoading: true, error: undefined };
  });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton while workspaces are loading', () => {
    mockSwrReturns({
      workspaces: { data: undefined, isLoading: true, error: undefined },
    });

    renderDashboard('ws-1');

    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state on fetch failure', () => {
    mockSwrReturns({
      workspaces: { data: undefined, isLoading: false, error: new Error('Network error') },
    });

    renderDashboard('ws-1');

    expect(screen.getByText('Network error')).toBeDefined();
  });

  it('shows empty state when no workspace matches the id', () => {
    mockSwrReturns({
      workspaces: { data: [], isLoading: false, error: undefined },
    });

    renderDashboard('ws-1');

    expect(screen.getByText('workspace.switcher.selectWorkspace')).toBeDefined();
    expect(screen.getByText('workspace.switcher.noWorkspaces')).toBeDefined();
  });

  it('renders tools grid when workspace is found', () => {
    mockSwrReturns({
      workspaces: {
        data: [{ id: 'ws-1', name: 'Test Workspace', role: 'owner' }],
        isLoading: false,
        error: undefined,
      },
    });

    renderDashboard('ws-1');

    expect(screen.getByText('Test Workspace')).toBeDefined();
    expect(screen.getByText('workspace.dashboard.subtitle')).toBeDefined();
    expect(screen.getByText('workspace.dashboard.tools')).toBeDefined();
    expect(screen.getByText(/Blog Post/)).toBeDefined();
    expect(screen.getByText(/Landing Funnel/)).toBeDefined();
  });

  it('shows empty sessions when workspace has no sessions', () => {
    mockSwrReturns({
      workspaces: {
        data: [{ id: 'ws-1', name: 'Test Workspace', role: 'owner' }],
        isLoading: false,
        error: undefined,
      },
      'sessions-ws-1': {
        data: { data: [], total: 0 },
        isLoading: false,
        error: undefined,
      },
    });

    renderDashboard('ws-1');

    expect(screen.getByText('workspace.dashboard.recentSessions')).toBeDefined();
    expect(screen.getByText('workspace.detail.noSessions')).toBeDefined();
  });

  it('renders session cards when sessions exist', () => {
    mockSwrReturns({
      workspaces: {
        data: [{ id: 'ws-1', name: 'Test Workspace', role: 'owner' }],
        isLoading: false,
        error: undefined,
      },
      'sessions-ws-1': {
        data: {
          data: [
            {
              id: 'session-1',
              toolKey: 'Blog Post',
              status: 'completed',
              createdAt: '2024-01-15T10:30:00Z',
            },
            {
              id: 'session-2',
              toolKey: 'Landing Page',
              status: 'failed',
              createdAt: '2024-01-16T14:00:00Z',
            },
          ],
          total: 2,
        },
        isLoading: false,
        error: undefined,
      },
    });

    renderDashboard('ws-1');

    expect(screen.getByText('workspace.dashboard.recentSessions')).toBeDefined();
    expect(screen.getByText('Blog Post')).toBeDefined();
    expect(screen.getByText('Landing Page')).toBeDefined();
    expect(screen.getByText('completed')).toBeDefined();
    expect(screen.getByText('failed')).toBeDefined();
  });

  it('navigates to tool page on tool card click', () => {
    mockSwrReturns({
      workspaces: {
        data: [{ id: 'ws-1', name: 'Test Workspace', role: 'owner' }],
        isLoading: false,
        error: undefined,
      },
    });

    renderDashboard('ws-1');

    const blogPostButton = screen.getByRole('button', { name: /Blog Post/ });
    fireEvent.click(blogPostButton);

    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/ws-1/tools/blog-post');
  });
});
