import { AppSettings } from '@/types/domain';

export const defaultSettings: AppSettings = {
  id: 'singleton',
  defaultStartTime: '08:00',
  soundEnabled: 1,
  vibrationEnabled: 1,
  autoHideCompletedTasks: 0,
  themeMode: 'system',
  language: 'system'
};

export const snoozeEveningTime = '19:00';
