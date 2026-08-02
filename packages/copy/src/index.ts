import * as it from './it';

class Copy {
  private locale: Record<string, unknown>;

  constructor() {
    this.locale = it as unknown as Record<string, unknown>;
  }

  t(key: string, params?: Record<string, string>): string {
    const parts = key.split('.');
    let value: unknown = this.locale;

    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
      if (value === undefined) {
        console.error(`[copy] Missing key: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return (value as string).replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }

    return value as string;
  }

  get raw() {
    return it;
  }
}

export const copy = new Copy();
