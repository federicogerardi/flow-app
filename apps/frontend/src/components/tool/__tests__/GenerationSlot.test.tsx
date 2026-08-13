import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenerationSlot } from '../GenerationSlot';
import type { ArtifactDTO } from '../../../api/client';

// ── Copy mock ────────────────────────────────────────────────────────────────────

vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

// ── Child mocks ─────────────────────────────────────────────────────────────────
// GenerationSlot is an orchestrator — its behavior is WHICH child renders
// in WHICH state. Mocking children isolates that orchestration contract.

vi.mock('../FeedbackPanel', () => ({
  FeedbackPanel: () => <div data-testid="feedback-panel">feedback-panel</div>,
}));

vi.mock('../SessionSummary', () => ({
  SessionSummary: () => <div data-testid="session-summary">session-summary</div>,
}));

vi.mock('../../shared/CompletionBanner', () => ({
  CompletionBanner: () => <div data-testid="completion-banner">completion-banner</div>,
}));

vi.mock('../../ErrorState', () => ({
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <div data-testid="error-state">
      error-state
      {onRetry && <button onClick={onRetry}>retry</button>}
    </div>
  ),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────────

function makeArtifact(overrides?: Partial<ArtifactDTO>): ArtifactDTO {
  return {
    id: 'art-1',
    stepNumber: 1,
    stepLabel: 'Extraction',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    sessionId: 'sess-1',
    content: 'Generated content',
    ...overrides,
  };
}

const baseProps = {
  progress: { completedCount: 1, total: 5 },
  stepArtifacts: [{ stepNumber: 1, content: 'partial' }],
  startedAt: '2026-01-01T00:00:00.000Z',
  artifacts: [] as ArtifactDTO[],
  totalSteps: 5,
};

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('GenerationSlot', () => {
  it('renders FeedbackPanel (live progress) for running status', () => {
    render(<GenerationSlot {...baseProps} status="running" />);

    expect(screen.getByTestId('feedback-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('completion-banner')).toBeNull();
    expect(screen.queryByTestId('session-summary')).toBeNull();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('renders CompletionBanner + SessionSummary for completed status', () => {
    render(
      <GenerationSlot
        {...baseProps}
        status="completed"
        artifacts={[makeArtifact()]}
        durationMs={125000}
      />,
    );

    expect(screen.getByTestId('completion-banner')).toBeInTheDocument();
    expect(screen.getByTestId('session-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('hides SessionSummary when completed but no artifacts', () => {
    render(<GenerationSlot {...baseProps} status="completed" durationMs={125000} />);

    expect(screen.getByTestId('completion-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('session-summary')).toBeNull();
  });

  it('renders ErrorState with retry for failed status', () => {
    const onRetry = vi.fn();
    render(<GenerationSlot {...baseProps} status="failed" onRetry={onRetry} />);

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.queryByTestId('completion-banner')).toBeNull();
    expect(screen.queryByTestId('session-summary')).toBeNull();
  });

  it('marks the live region aria-hidden once terminal (screen-reader safety)', () => {
    const { container } = render(<GenerationSlot {...baseProps} status="completed" />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the live region announcement active while running', () => {
    const { container } = render(<GenerationSlot {...baseProps} status="running" />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('treats cancelled as terminal (no live panel, no error state)', () => {
    render(<GenerationSlot {...baseProps} status="cancelled" />);

    expect(screen.queryByTestId('completion-banner')).toBeNull();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.queryByTestId('session-summary')).toBeNull();
  });
});