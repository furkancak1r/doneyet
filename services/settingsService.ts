import { defaultSettings } from '@/constants/settings';
import { fetchSettings, saveSettings } from '@/db/repositories';
import { AppSettings, ThemeMode } from '@/types/domain';

export async function getSettings(): Promise<AppSettings> {
  return fetchSettings();
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const current = await fetchSettings();
  const next: AppSettings = {
    ...defaultSettings,
    ...current,
    ...updates,
    id: 'singleton'
  };

  await saveSettings(next);
  return next;
}

export async function setThemeMode(themeMode: ThemeMode): Promise<AppSettings> {
  return updateSettings({ themeMode });
}

export async function setDefaultStartTime(defaultStartTime: string): Promise<AppSettings> {
  return updateSettings({ defaultStartTime });
}
