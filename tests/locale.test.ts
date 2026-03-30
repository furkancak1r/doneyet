import { afterEach, describe, expect, it } from 'vitest';
import i18n, { getLocaleForLanguage, normalizeLanguage } from '../i18n';
import { getCurrentAppLanguage, getCurrentLocale } from '../utils/locale';

describe('locale resolution', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it.each([
    ['tr', 'tr', 'tr-TR'],
    ['tr-TR', 'tr', 'tr-TR'],
    ['en', 'en', 'en-US'],
    ['en-US', 'en', 'en-US']
  ])('normalizes %s to the expected app language and locale', (input, expectedLanguage, expectedLocale) => {
    expect(normalizeLanguage(input)).toBe(expectedLanguage);
    expect(getLocaleForLanguage(input)).toBe(expectedLocale);
  });

  it('keeps Turkish month names localized when the locale is region-tagged', () => {
    const locale = getLocaleForLanguage('tr-TR');
    const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(2025, 0, 1));

    expect(monthLabel).toContain('Ocak');
  });

  it('reads the active app language from i18n and normalizes the locale', async () => {
    await i18n.changeLanguage('tr-TR');

    expect(getCurrentAppLanguage()).toBe('tr');
    expect(getCurrentLocale()).toBe('tr-TR');
  });
});
