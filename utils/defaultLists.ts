import translations from '@/locales/translations.json';
import { defaultListSeeds } from '@/constants/theme';
import type { AppLanguage } from '@/i18n';
import type { AppList } from '@/types/domain';

type Seed = (typeof defaultListSeeds)[number];
const supportedLanguages: AppLanguage[] = ['tr', 'en'];

function getSeedLeafKey(seedKey: string): string {
  return seedKey.split('.').pop() ?? seedKey;
}

export function getDefaultSeedName(seed: Seed, language: AppLanguage): string {
  const leafKey = getSeedLeafKey(seed.nameKey);
  return String((translations as Record<AppLanguage, { seeds: Record<string, string> }>)[language].seeds[leafKey]);
}

export function resolveDefaultSeedKey(list: Pick<AppList, 'name' | 'color' | 'icon'>): string | null {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', usage: 'search' });

  for (const seed of defaultListSeeds) {
    if (list.color !== seed.color || list.icon !== seed.icon) {
      continue;
    }

    if (supportedLanguages.some((language) => collator.compare(list.name.trim(), getDefaultSeedName(seed, language)) === 0)) {
      return seed.nameKey;
    }
  }

  return null;
}

export function shouldLockSeedName(current: AppList, updates: Partial<Pick<AppList, 'name' | 'color' | 'icon' | 'sortOrder'>>): boolean {
  return Boolean(current.seedKey && typeof updates.name === 'string' && updates.name.trim() !== current.name.trim());
}
