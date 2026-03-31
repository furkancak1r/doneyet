import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../constants/settings';
import { syncForegroundAppState } from '../services/appForegroundSync';

describe('app foreground sync', () => {
  it('refreshes system language, permission state, and schedules when returning active', async () => {
    const setAppLanguage = vi.fn().mockResolvedValue('tr');
    const getNotificationPermissions = vi.fn().mockResolvedValue({ granted: true });
    const setNotificationGranted = vi.fn();
    const configureNotificationHandling = vi.fn();
    const restoreAllTaskSchedules = vi.fn().mockResolvedValue(undefined);

    const granted = await syncForegroundAppState(
      { ...defaultSettings, language: 'system' },
      {
        configureNotificationHandling,
        getNotificationPermissions,
        restoreAllTaskSchedules,
        setAppLanguage,
        setNotificationGranted
      }
    );

    expect(granted).toBe(true);
    expect(setAppLanguage).toHaveBeenCalledWith('system');
    expect(getNotificationPermissions).toHaveBeenCalledTimes(1);
    expect(setNotificationGranted).toHaveBeenCalledWith(true);
    expect(configureNotificationHandling).toHaveBeenCalledWith({ ...defaultSettings, language: 'system' });
    expect(restoreAllTaskSchedules).toHaveBeenCalledWith({ ...defaultSettings, language: 'system' });
  });

  it('still refreshes permission state and schedules when the app language is fixed', async () => {
    const setAppLanguage = vi.fn().mockResolvedValue('en');
    const getNotificationPermissions = vi.fn().mockResolvedValue({ granted: false });
    const setNotificationGranted = vi.fn();
    const configureNotificationHandling = vi.fn();
    const restoreAllTaskSchedules = vi.fn().mockResolvedValue(undefined);
    const settings = { ...defaultSettings, language: 'en' as const };

    const granted = await syncForegroundAppState(settings, {
      configureNotificationHandling,
      getNotificationPermissions,
      restoreAllTaskSchedules,
      setAppLanguage,
      setNotificationGranted
    });

    expect(granted).toBe(false);
    expect(setAppLanguage).not.toHaveBeenCalled();
    expect(setNotificationGranted).toHaveBeenCalledWith(false);
    expect(configureNotificationHandling).toHaveBeenCalledWith(settings);
    expect(restoreAllTaskSchedules).toHaveBeenCalledWith(settings);
  });
});
