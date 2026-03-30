import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../constants/settings';

describe('settings defaults', () => {
  it('uses 09:00 as the default start time', () => {
    expect(defaultSettings.defaultStartTime).toBe('09:00');
  });
});
