import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Task } from '../types/domain';

const scheduleNotificationAsync = vi.fn();
const setNotificationHandler = vi.fn();
const setNotificationChannelAsync = vi.fn();
const setNotificationCategoryAsync = vi.fn();

vi.mock('expo-notifications', () => ({
  AndroidImportance: {
    HIGH: 'high'
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date'
  },
  scheduleNotificationAsync: (...args: unknown[]) => scheduleNotificationAsync(...args),
  setNotificationHandler: (...args: unknown[]) => setNotificationHandler(...args),
  setNotificationChannelAsync: (...args: unknown[]) => setNotificationChannelAsync(...args),
  setNotificationCategoryAsync: (...args: unknown[]) => setNotificationCategoryAsync(...args)
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android'
  }
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key
  }
}));

import { scheduleTaskReminder, TASK_REMINDER_CATEGORY, TASK_REMINDER_CHANNEL } from '../services/notificationService';

function buildTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  const { id, ...rest } = overrides;
  return {
    id,
    title: 'Kredi karti odemesi',
    description: '',
    listId: 'list-1',
    sortOrder: 0,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    startReminderType: 'monthly_on_last_day',
    startDateTime: '2026-03-31T06:00:00.000Z',
    startReminderWeekday: null,
    startReminderDayOfMonth: null,
    startReminderTime: '09:00',
    startReminderUsesLastDay: 1,
    taskMode: 'single',
    repeatIntervalType: 'preset',
    repeatIntervalValue: 1,
    repeatIntervalUnit: 'hours',
    status: 'active',
    lastNotificationAt: null,
    nextNotificationAt: '2026-03-31T06:00:00.000Z',
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: null,
    ...rest
  };
}

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a foreground notification handler without the deprecated alert flag', async () => {
    vi.resetModules();
    const { configureNotificationHandling } = await import('../services/notificationService');

    configureNotificationHandling();

    expect(setNotificationHandler).toHaveBeenCalledTimes(1);

    const [handlerConfig] = setNotificationHandler.mock.calls[0] as [
      { handleNotification: () => Promise<Record<string, boolean>> }
    ];
    const notificationBehavior = await handlerConfig.handleNotification();

    expect(notificationBehavior).toEqual({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    });
    expect(notificationBehavior).not.toHaveProperty('shouldShowAlert');
  });

  it('schedules reminders with an explicit Expo DATE trigger on Android', async () => {
    const fireAt = new Date('2026-03-31T06:00:00.000Z');
    const task = buildTask({ id: 'task-1' });
    scheduleNotificationAsync.mockResolvedValue('notif-1');

    const result = await scheduleTaskReminder(task, fireAt, true);

    expect(result).toBe('notif-1');
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        categoryIdentifier: TASK_REMINDER_CATEGORY,
        sound: 'default',
        data: {
          taskId: 'task-1',
          taskTitle: task.title,
          scheduledFor: fireAt.toISOString()
        }
      }),
      trigger: {
        type: 'date',
        date: fireAt,
        channelId: TASK_REMINDER_CHANNEL
      }
    });
  });
});
