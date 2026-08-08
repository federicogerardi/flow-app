import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueuedCard } from '../QueuedCard';
import type { SessionListItemDTO } from '@flow-app/contracts';

// ── Copy mock ────────────────────────────────────────────────────────────────────

vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

// ── Fixture ─────────────────────────────────────────────────────────────────────

function makeSession(overrides?: Partial<SessionListItemDTO>): SessionListItemDTO {
  return {
    id: 'sess-1',
    toolKey: 'blog-post',
    workspaceId: 'ws-1',
    status: 'queued',
    stepCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('QueuedCard', () => {
  it('renders tool label from toolKey', () => {
    render(<QueuedCard session={makeSession()} />);
    expect(screen.getByText('Blog Post')).toBeInTheDocument();
  });

  it('shows Queued status chip', () => {
    render(<QueuedCard session={makeSession()} />);
    expect(screen.getByText('shared.sessionStatus.queued')).toBeInTheDocument();
  });

  it('shows queue position when available', () => {
    render(<QueuedCard session={makeSession({ queuePosition: 3 })} />);
    // copy.t() mock returns the key; parameter interpolation is not applied
    expect(screen.getByText('shared.session.queuePosition')).toBeInTheDocument();
  });

  it('shows loading text when queue position is not available', () => {
    render(<QueuedCard session={makeSession({ queuePosition: undefined })} />);
    expect(screen.getByText('shared.status.loading')).toBeInTheDocument();
  });

  it('renders cancel button when onCancel provided', () => {
    render(<QueuedCard session={makeSession()} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'shared.actions.cancel' })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<QueuedCard session={makeSession()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'shared.actions.cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});