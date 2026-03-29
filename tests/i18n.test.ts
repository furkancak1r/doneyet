import { describe, expect, it } from 'vitest';
import translations from '../locales/translations.json';

function collectPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return entries.flatMap(([key, child]) => collectPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe('translations', () => {
  it('keeps Turkish and English keys in sync', () => {
    const trKeys = collectPaths(translations.tr).sort();
    const enKeys = collectPaths(translations.en).sort();

    expect(trKeys).toEqual(enKeys);
  });
});
