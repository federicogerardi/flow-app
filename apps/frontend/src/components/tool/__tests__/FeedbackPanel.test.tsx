import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FeedbackPanel } from '../FeedbackPanel';
import type { ArtifactDTO } from '../../../api/client';

// ── Copy mock ────────────────────────────────────────────────────────────────────

vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

// ── rAF polyfill (ElapsedTimer uses requestAnimationFrame loop) ─────────────────

beforeAll(() => {
  let rafId = 0;
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (_cb: FrameRequestCallback) => {
    rafId += 1;
    return rafId;
  };
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = () => {};
});

// ── Fixtures ────────────────────────────────────────────────────────────────────

function makeArtifact(overrides?: Partial<ArtifactDTO>): ArtifactDTO {
  return {
    id: 'art-1',
    stepNumber: 1,
    stepLabel: 'Extraction',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    sessionId: 'sess-1',
    content: 'Generated content for step 1',
    ...overrides,
  };
}

const progress = { completedCount: 2, total: 5 };

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('FeedbackPanel', () => {
  describe('queued / starting state (no progress)', () => {
    it('shows queued message when status is queued', () => {
      render(<FeedbackPanel progress={null} status="queued" />);
      expect(screen.getByText('toolPage.progress.queued')).toBeInTheDocument();
      expect(screen.getByText('toolPage.progress.queuedHint')).toBeInTheDocument();
    });

    it('shows queued message when status is draft', () => {
      render(<FeedbackPanel progress={null} status="draft" />);
      expect(screen.getByText('toolPage.progress.queued')).toBeInTheDocument();
    });

    it('shows starting message for running status without progress', () => {
      render(<FeedbackPanel progress={null} status="running" />);
      expect(screen.getByText('toolPage.progress.starting')).toBeInTheDocument();
      expect(screen.queryByText('toolPage.progress.queuedHint')).toBeNull();
    });

    it('shows step count chip when totalSteps > 1', () => {
      render(<FeedbackPanel progress={null} status="queued" totalSteps={5} />);
      expect(screen.getByText('toolPage.progress.stepCount')).toBeInTheDocument();
    });
  });

  describe('progress state', () => {
    it('renders step indicators for each step in compact layout', () => {
      const { container } = render(
        <FeedbackPanel progress={progress} status="running" totalSteps={5} />,
      );

      // 5 step indicators (role="listitem")
      expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(5);
    });

    it('renders a determinate progress bar', () => {
      const { container } = render(
        <FeedbackPanel progress={progress} status="running" totalSteps={5} />,
      );

      const progressBar = container.querySelector('.MuiLinearProgress-root');
      expect(progressBar).toBeInTheDocument();
      expect(screen.getByText('2/5')).toBeInTheDocument();
    });

    it('renders elapsed timer with role="timer"', () => {
      render(
        <FeedbackPanel
          progress={progress}
          status="running"
          startedAt="2026-01-01T00:00:00.000Z"
        />,
      );

      expect(screen.getByRole('timer')).toBeInTheDocument();
    });
  });

  describe('side-by-side layout', () => {
    it('shows live preview panel with latest artifact content', () => {
      render(
        <FeedbackPanel
          progress={progress}
          status="running"
          layoutMode="side-by-side"
          totalSteps={5}
          artifacts={[
            makeArtifact({ stepNumber: 1, content: 'First step content' }),
            makeArtifact({ stepNumber: 2, content: 'Latest completed content' }),
          ]}
        />,
      );

      // Live preview region
      const livePreview = screen.getByLabelText('toolPage.progress.livePreviewAria');
      expect(livePreview).toBeInTheDocument();
      // Shows the LATEST completed artifact, not the in-flight step
      // (scoped to the live preview panel — the content also appears in the
      // step-indicator preview, hence `within`)
      expect(within(livePreview).getByText('Latest completed content')).toBeInTheDocument();
      expect(within(livePreview).getByText('toolPage.progress.lastCompletedStep')).toBeInTheDocument();
    });

    it('shows waiting-for-content placeholder when no artifacts yet', () => {
      render(
        <FeedbackPanel
          progress={{ completedCount: 0, total: 5 }}
          status="running"
          layoutMode="side-by-side"
          totalSteps={5}
          artifacts={[]}
        />,
      );

      expect(screen.getByText('toolPage.progress.waitingForContent')).toBeInTheDocument();
    });
  });

  describe('compact layout (default)', () => {
    it('does not render the live preview panel', () => {
      render(
        <FeedbackPanel progress={progress} status="running" totalSteps={5} />,
      );

      expect(screen.queryByLabelText('toolPage.progress.livePreviewAria')).toBeNull();
    });
  });
});