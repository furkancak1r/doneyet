import i18n, { getLocaleForLanguage, normalizeLanguage, type AppLanguage, type AppLanguageSetting } from '@/i18n';

export function getCurrentAppLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language);
}

export function getCurrentLocale(): string {
  return getLocaleForLanguage(i18n.language);
}

export function getLocaleForSetting(language: AppLanguageSetting | undefined): string {
  return language === 'system' || language === undefined ? getCurrentLocale() : getLocaleForLanguage(language);
}
