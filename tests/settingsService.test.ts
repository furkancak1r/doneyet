import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../constants/settings';
import { AppSettings } from '../types/domain';

const fetchSettings = vi.fn();
const saveSettings = vi.fn();

vi.mock('@/db/repositories', () => ({
  fetchSettings: (...args: unknown[]) => fetchSettings(...args),
  saveSettings: (...args: unknown[]) => saveSettings(...args)
}));

describe('settings service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('serializes concurrent partial updates so later saves include earlier changes', async () => {
    const { updateSettings } = await import('../services/settingsService');
    let persisted: AppSettings = {
      ...defaultSettings,
      id: 'singleton',
      defaultStartTime: '09:00',
      soundEnabled: 1
    };

    fetchSettings.mockImplementation(async () => ({ ...persisted }));
    saveSettings.mockImplementation(async (nextSettings: AppSettings) => {
      persisted = nextSettings;
    });

    const [firstUpdate, secondUpdate] = await Promise.all([
      updateSettings({ defaultStartTime: '10:00' }),
      updateSettings({ soundEnabled: 0 })
    ]);

    expect(firstUpdate).toEqual(expect.objectContaining({ defaultStartTime: '10:00', soundEnabled: 1 }));
    expect(secondUpdate).toEqual(expect.objectContaining({ defaultStartTime: '10:00', soundEnabled: 0 }));
    expect(saveSettings).toHaveBeenNthCalledWith(1, expect.objectContaining({ defaultStartTime: '10:00', soundEnabled: 1 }));
    expect(saveSettings).toHaveBeenNthCalledWith(2, expect.objectContaining({ defaultStartTime: '10:00', soundEnabled: 0 }));
  });
});
