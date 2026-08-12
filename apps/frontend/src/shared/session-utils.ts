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
