import type { SessionStatusDTO } from '@flow-app/contracts';

export function formatToolLabel(toolKey: string): string {
  return toolKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatElapsedSeconds(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null) return '';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

/**
 * Convert a millisecond duration to a human-readable string.
 * Delegates to formatElapsedSeconds for consistency.
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return formatElapsedSeconds(Math.round(ms / 1000));
}

// ── Session status predicates ──────────────────────────────────────────────────

/** Statuses that represent terminal (non-progressing) sessions. */
export const TERMINAL_STATUSES: ReadonlySet<SessionStatusDTO> = new Set([
  'completed',
  'failed',
  'cancelled',
]);

/** Returns true when the session has reached a terminal state. */
export function isTerminalStatus(status: SessionStatusDTO): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Returns true when the session is actively generating steps. */
export function isRunningStatus(status: SessionStatusDTO): boolean {
  return status === 'running';
}

/** Returns true when the session completed successfully. */
export function isCompletedStatus(status: SessionStatusDTO): boolean {
  return status === 'completed';
}

/** Returns true when the session failed. */
export function isFailedStatus(status: SessionStatusDTO): boolean {
  return status === 'failed';
}
