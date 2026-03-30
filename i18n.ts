import translations from '@/locales/translations.json';

const i18nImport = require('i18next');
const i18n = i18nImport.default ?? i18nImport;
const reactI18nextImport = require('react-i18next');
const initReactI18next = reactI18nextImport.initReactI18next ?? reactI18nextImport.default?.initReactI18next;
let getLocales: (() => Array<{ languageCode?: string; languageTag?: string }>) | undefined;
try {
  const localizationImport = require('expo-localization');
  getLocales = localizationImport.getLocales ?? localizationImport.default?.getLocales;
} catch {
  getLocales = undefined;
}

export type AppLanguageSetting = 'system' | 'tr' | 'en';
export type AppLanguage = 'tr' | 'en';

const supportedLanguages: AppLanguage[] = ['tr', 'en'];
const resources = {
  tr: { translation: translations.tr },
  en: { translation: translations.en }
};

export function normalizeLanguage(value?: string | null): AppLanguage {
  const language = (value ?? '').toLowerCase();
  return language.startsWith('tr') ? 'tr' : 'en';
}

export function getDeviceLanguage(): AppLanguage {
  try {
    if (typeof getLocales !== 'function') {
      return 'tr';
    }

    const locales = getLocales();
    return normalizeLanguage(locales[0]?.languageCode ?? locales[0]?.languageTag);
  } catch {
    return 'tr';
  }
}

export function resolveAppLanguage(language: AppLanguageSetting | undefined): AppLanguage {
  if (language === 'tr' || language === 'en') {
    return language;
  }

  return getDeviceLanguage();
}

export function getLocaleForLanguage(language: string | undefined): string {
  return normalizeLanguage(language) === 'tr' ? 'tr-TR' : 'en-US';
}

export async function setAppLanguage(language: AppLanguageSetting | undefined): Promise<AppLanguage> {
  const next = resolveAppLanguage(language);
  if (i18n.language !== next) {
    await i18n.changeLanguage(next);
  }
  return next;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  defaultNS: 'translation',
  interpolation: {
    escapeValue: false
  },
  compatibilityJSON: 'v4'
});

export default i18n;
export { supportedLanguages };
