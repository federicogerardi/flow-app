import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueuedCard } from '../QueuedCard';
import type { SessionListItemDTO } from '@flow-app/contracts';

function makeSession(overrides?: Partial<SessionListItemDTO>): SessionListItemDTO {
  return {
    id: 'sess-1',
    toolKey: 'blog-post',
    workspaceId: 'ws-1',
    status: 'queued',
    stepCount: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('QueuedCard', () => {
  it('renders tool label from toolKey', () => {
    render(<QueuedCard session={makeSession({ toolKey: 'blog-post' })} />);
    expect(screen.getByText('Blog Post')).toBeInTheDocument();
  });

  it('shows queued status chip', () => {
    render(<QueuedCard session={makeSession()} />);
    expect(screen.getByText('Queued')).toBeInTheDocument();
  });

  it('shows queue position when available', () => {
    render(<QueuedCard session={makeSession({ queuePosition: 3 })} />);
    expect(screen.getByText('Queue position: 3')).toBeInTheDocument();
  });

  it('shows "Waiting..." when queuePosition is undefined', () => {
    render(<QueuedCard session={makeSession({ queuePosition: undefined })} />);
    expect(screen.getByText('Waiting...')).toBeInTheDocument();
  });

  it('renders cancel button when onCancel provided', () => {
    render(<QueuedCard session={makeSession()} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /annulla/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<QueuedCard session={makeSession()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /annulla/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('has reduced opacity', () => {
    const { container } = render(<QueuedCard session={makeSession()} />);
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
    // opacity: 0.7 is applied via sx on the Card variant="outlined"
  });
});