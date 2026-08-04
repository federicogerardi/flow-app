/**
 * UUID v4 generator — zero external dependencies.
 * Uses the Web Crypto API when available (Node 19+, browser), falls back to Math.random.
 */
export function randomUUID(): string {
  // Use global crypto if available (Node 19+, browser)
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID() as string;
  }

  // Fallback: RFC 4122 v4 UUID using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
