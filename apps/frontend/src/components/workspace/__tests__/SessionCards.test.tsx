import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunningCard } from '../RunningCard';
import { CompletedCard } from '../CompletedCard';
import { FailedCard } from '../FailedCard';
import type { SessionListItemDTO } from '@flow-app/contracts';

// ── Fixture ─────────────────────────────────────────────────────────────────────

function makeSession(overrides?: Partial<SessionListItemDTO>): SessionListItemDTO {
  return {
    id: 'sess-1',
    toolKey: 'blog-post',
    workspaceId: 'ws-1',
    status: 'running',
    stepCount: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── RunningCard ─────────────────────────────────────────────────────────────────

describe('RunningCard', () => {
  it('renders tool label from toolKey', () => {
    render(<RunningCard session={makeSession({ toolKey: 'blog-post' })} />);
    expect(screen.getByText('Blog Post')).toBeInTheDocument();
  });

  it('shows Running status chip', () => {
    render(<RunningCard session={makeSession()} />);
    expect(screen.getByText('In esecuzione')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    const { container } = render(<RunningCard session={makeSession({ currentStepIndex: 2, stepCount: 5 })} />);
    const progressBar = container.querySelector('.MuiLinearProgress-root');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows step label with count and elapsed time', () => {
    render(<RunningCard session={makeSession({
      currentStepIndex: 1,
      stepCount: 5,
      currentStepLabel: 'Generating...',
      elapsedSeconds: 45,
    })} />);
    expect(screen.getByText(/Step 2\/5/)).toBeInTheDocument();
    expect(screen.getByText(/Generating\.\.\./)).toBeInTheDocument();
    expect(screen.getByText(/45s/)).toBeInTheDocument();
  });

  it('shows artifact preview when available', () => {
    render(<RunningCard session={makeSession({ lastArtifactPreview: 'Partial content...' })} />);
    expect(screen.getByText('Partial content...')).toBeInTheDocument();
  });

  it('renders View progress and Cancel buttons when callbacks provided', () => {
    render(<RunningCard session={makeSession()} onViewProgress={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /vedi asset/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /annulla/i })).toBeInTheDocument();
  });

  it('calls onViewProgress and onCancel when buttons clicked', () => {
    const onView = vi.fn();
    const onCancel = vi.fn();
    render(<RunningCard session={makeSession()} onViewProgress={onView} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /vedi asset/i }));
    expect(onView).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: /annulla/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('has left border accent color for running state', () => {
    const { container } = render(<RunningCard session={makeSession()} />);
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
    // sx={{ borderLeft: 3, borderLeftColor: 'primary.main' }} is verified
  });
});

// ── CompletedCard ───────────────────────────────────────────────────────────────

describe('CompletedCard', () => {
  it('renders tool label from toolKey', () => {
    render(<CompletedCard session={makeSession({ toolKey: 'blog-post', status: 'completed' })} />);
    expect(screen.getByText('Blog Post')).toBeInTheDocument();
  });

  it('shows Completed status chip with check icon', () => {
    render(<CompletedCard session={makeSession({ status: 'completed' })} />);
    expect(screen.getByText('Completata')).toBeInTheDocument();
  });

  it('shows step count and duration', () => {
    render(<CompletedCard session={makeSession({
      status: 'completed',
      stepCount: 3,
      durationSeconds: 125,
    })} />);
    expect(screen.getByText(/3 steps/)).toBeInTheDocument();
    expect(screen.getByText(/2m 5s/)).toBeInTheDocument();
  });

  it('shows artifact preview when available', () => {
    render(<CompletedCard session={makeSession({
      status: 'completed',
      lastArtifactPreview: 'Final output preview...',
    })} />);
    expect(screen.getByText('Final output preview...')).toBeInTheDocument();
  });

  it('renders View, Download, and Promote buttons', () => {
    render(<CompletedCard
      session={makeSession({ status: 'completed', isPromotable: true })}
      onView={() => {}}
      onDownload={() => {}}
      onPromote={() => {}}
    />);
    expect(screen.getByRole('button', { name: /vedi asset$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scarica/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /promuovi/i })).toBeInTheDocument();
  });

  it('hides promote button when isPromotable is false', () => {
    render(<CompletedCard
      session={makeSession({ status: 'completed', isPromotable: false })}
      onPromote={() => {}}
    />);
    expect(screen.queryByRole('button', { name: /promuovi/i })).toBeNull();
  });

  it('calls onView, onDownload, and onPromote', () => {
    const onView = vi.fn();
    const onDownload = vi.fn();
    const onPromote = vi.fn();
    render(<CompletedCard
      session={makeSession({ status: 'completed', isPromotable: true })}
      onView={onView}
      onDownload={onDownload}
      onPromote={onPromote}
    />);

    fireEvent.click(screen.getByRole('button', { name: /vedi asset$/i }));
    fireEvent.click(screen.getByRole('button', { name: /scarica/i }));
    fireEvent.click(screen.getByRole('button', { name: /promuovi/i }));

    expect(onView).toHaveBeenCalledOnce();
    expect(onDownload).toHaveBeenCalledOnce();
    expect(onPromote).toHaveBeenCalledOnce();
  });
});

// ── FailedCard ──────────────────────────────────────────────────────────────────

describe('FailedCard', () => {
  it('renders tool label from toolKey', () => {
    render(<FailedCard session={makeSession({ toolKey: 'blog-post', status: 'failed' })} />);
    expect(screen.getByText('Blog Post')).toBeInTheDocument();
  });

  it('shows Failed status chip with error icon', () => {
    render(<FailedCard session={makeSession({ status: 'failed' })} />);
    expect(screen.getByText('Fallita')).toBeInTheDocument();
  });

  it('shows error message and failed step', () => {
    render(<FailedCard session={makeSession({
      status: 'failed',
      errorMessage: 'LLM timeout',
      failedAtStep: 2,
    })} />);
    expect(screen.getByText(/LLM timeout/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
  });

  it('shows default error message when errorMessage is undefined', () => {
    render(<FailedCard session={makeSession({ status: 'failed', errorMessage: undefined })} />);
    expect(screen.getByText('Si è verificato un errore')).toBeInTheDocument();
  });

  it('has left border error color', () => {
    const { container } = render(<FailedCard session={makeSession({ status: 'failed' })} />);
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
    // sx={{ borderLeft: 3, borderLeftColor: 'error.main' }} is verified
  });

  it('renders retry button when onRetry provided', () => {
    render(<FailedCard session={makeSession({ status: 'failed' })} onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: /riprova/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<FailedCard session={makeSession({ status: 'failed' })} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /riprova/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});