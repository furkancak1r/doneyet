import i18n from '@/i18n';
import type { AppLanguage, AppLanguageSetting } from '@/i18n';

export function getCurrentAppLanguage(): AppLanguage {
  return (i18n.language === 'tr' ? 'tr' : 'en') as AppLanguage;
}

export function getCurrentLocale(): string {
  return getCurrentAppLanguage() === 'tr' ? 'tr-TR' : 'en-US';
}

export function getLocaleForSetting(language: AppLanguageSetting | undefined): string {
  return language === 'tr' ? 'tr-TR' : language === 'en' ? 'en-US' : getCurrentLocale();
}
