import { AppSettings } from '@/types/domain';

type NotificationPermissions = {
  granted: boolean;
};

type ForegroundSyncDependencies = {
  configureNotificationHandling: (settings: Pick<AppSettings, 'soundEnabled' | 'vibrationEnabled'>) => void;
  getNotificationPermissions: () => Promise<NotificationPermissions>;
  restoreAllTaskSchedules: (settings: AppSettings) => Promise<void>;
  setAppLanguage: (language: AppSettings['language']) => Promise<unknown>;
  setNotificationGranted: (granted: boolean) => void;
};

export async function syncForegroundAppState(settings: AppSettings, dependencies: ForegroundSyncDependencies): Promise<boolean> {
  if (settings.language === 'system') {
    await dependencies.setAppLanguage('system');
  }

  const permissions = await dependencies.getNotificationPermissions();
  dependencies.setNotificationGranted(permissions.granted);
  dependencies.configureNotificationHandling(settings);
  await dependencies.restoreAllTaskSchedules(settings);

  return permissions.granted;
}
