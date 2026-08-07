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
    expect(screen.getAllByText(/Blog Post/).length).toBeGreaterThanOrEqual(1);
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
              toolKey: 'blog-post',
              workspaceId: 'ws-1',
              status: 'running',
              stepCount: 5,
              currentStepIndex: 2,
              currentStepLabel: 'Generating...',
              elapsedSeconds: 30,
              createdAt: '2024-01-15T10:30:00Z',
            },
            {
              id: 'session-2',
              toolKey: 'landing-page',
              workspaceId: 'ws-1',
              status: 'completed',
              stepCount: 3,
              durationSeconds: 120,
              createdAt: '2024-01-16T14:00:00Z',
            },
            {
              id: 'session-3',
              toolKey: 'brief',
              workspaceId: 'ws-1',
              status: 'failed',
              stepCount: 4,
              errorMessage: 'LLM timeout',
              failedAtStep: 2,
              createdAt: '2024-01-17T09:00:00Z',
            },
          ],
          total: 3,
        },
        isLoading: false,
        error: undefined,
      },
      // Provide SWR keys for AssetCoverageBar and WorkspaceMembers to prevent loading states
      'assets-ws-1-coverage': {
        data: { assets: [] },
        isLoading: false,
        error: undefined,
      },
      'members-ws-1': {
        data: [],
        isLoading: false,
        error: undefined,
      },
    });

    renderDashboard('ws-1');

    // Session list section title should be visible
    expect(screen.getByText('workspace.dashboard.recentSessions')).toBeDefined();

    // Session list tabs should be visible (always rendered with badge counts)
    expect(screen.getByText('In Progress')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();
    expect(screen.getByText('Failed')).toBeDefined();

    // Default tab is "in-progress" — running card should be visible
    // Running card transforms toolKey kebab-case → Title Case
    // Note: Blog Post also appears in the tools grid (ToolCard) — use getAllByText
    expect(screen.getAllByText('Blog Post').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Running')).toBeDefined();

    // Tools grid should render all tool cards (always rendered, separate from sessions)
    // Note: ToolCard renders "📄 Landing Page" (emoji prefix) — use regex matcher
    expect(screen.getByText(/Landing Page/)).toBeDefined();
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
