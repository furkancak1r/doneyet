import { defaultSettings } from '@/constants/settings';
import { fetchSettings, saveSettings } from '@/db/repositories';
import { AppSettings, ThemeMode } from '@/types/domain';

let settingsUpdateQueue: Promise<unknown> = Promise.resolve();

function enqueueSettingsUpdate<T>(operation: () => Promise<T>): Promise<T> {
  const nextOperation = settingsUpdateQueue.then(operation, operation);
  settingsUpdateQueue = nextOperation.then(
    () => undefined,
    () => undefined
  );
  return nextOperation;
}

export async function getSettings(): Promise<AppSettings> {
  return fetchSettings();
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  return enqueueSettingsUpdate(async () => {
    const current = await fetchSettings();
    const next: AppSettings = {
      ...defaultSettings,
      ...current,
      ...updates,
      id: 'singleton'
    };

    await saveSettings(next);
    return next;
  });
}

export async function setThemeMode(themeMode: ThemeMode): Promise<AppSettings> {
  return updateSettings({ themeMode });
}

export async function setDefaultStartTime(defaultStartTime: string): Promise<AppSettings> {
  return updateSettings({ defaultStartTime });
}
