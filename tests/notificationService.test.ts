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

import {
  resolveSnoozeTime,
  scheduleTaskReminder,
  TASK_RECURRING_REMINDER_CATEGORY,
  TASK_REMINDER_CATEGORY,
  TASK_REMINDER_CHANNEL
} from '../services/notificationService';

function expectLocalDateTime(
  date: Date,
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number
): void {
  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(monthIndex);
  expect(date.getDate()).toBe(day);
  expect(date.getHours()).toBe(hour);
  expect(date.getMinutes()).toBe(minute);
}

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

    await configureNotificationHandling();

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
    expect(setNotificationCategoryAsync).toHaveBeenCalledTimes(2);

    const categoryCalls = new Map(
      setNotificationCategoryAsync.mock.calls as Array<[string, Array<{ identifier: string }>]>
    );

    expect(categoryCalls.get(TASK_REMINDER_CATEGORY)?.map((action) => action.identifier)).toEqual([
      'mark_done',
      'snooze_10_min',
      'snooze_1_hour',
      'snooze_evening',
      'snooze_tomorrow'
    ]);
    expect(categoryCalls.get(TASK_RECURRING_REMINDER_CATEGORY)?.map((action) => action.identifier)).toEqual([
      'mark_done',
      'mark_done_forever',
      'snooze_10_min',
      'snooze_tomorrow'
    ]);
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

  it('uses the recurring notification category for recurring tasks', async () => {
    const fireAt = new Date('2026-03-31T06:00:00.000Z');
    const task = buildTask({ id: 'task-recurring', taskMode: 'recurring' });
    scheduleNotificationAsync.mockResolvedValue('notif-recurring');

    await scheduleTaskReminder(task, fireAt, true);

    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        categoryIdentifier: TASK_RECURRING_REMINDER_CATEGORY
      }),
      trigger: {
        type: 'date',
        date: fireAt,
        channelId: TASK_REMINDER_CHANNEL
      }
    });
  });

  it('uses the task reminder clock for tomorrow snoozes', () => {
    const now = new Date(2026, 2, 31, 18, 45, 0, 0);

    const result = resolveSnoozeTime(
      'snooze_tomorrow',
      now,
      buildTask({
        id: 'task-2',
        startReminderTime: '09:30'
      })
    );

    expectLocalDateTime(result, 2026, 3, 1, 9, 30);
  });

  it('bases 10 minute snoozes on the task scheduled time when it is still useful', () => {
    const now = new Date(2026, 2, 31, 11, 15, 0, 0);
    const scheduledFor = new Date(2026, 2, 31, 13, 0, 0, 0);

    const result = resolveSnoozeTime(
      'snooze_10_min',
      now,
      buildTask({
        id: 'task-3',
        nextNotificationAt: scheduledFor.toISOString()
      })
    );

    expectLocalDateTime(result, 2026, 2, 31, 13, 10);
  });

  it('falls back to now when the scheduled-time snooze would already be in the past', () => {
    const now = new Date(2026, 2, 31, 13, 20, 0, 0);
    const scheduledFor = new Date(2026, 2, 31, 13, 0, 0, 0);

    const result = resolveSnoozeTime(
      'snooze_10_min',
      now,
      buildTask({
        id: 'task-4',
        nextNotificationAt: scheduledFor.toISOString()
      })
    );

    expectLocalDateTime(result, 2026, 2, 31, 13, 30);
  });

  it('uses the notification scheduledFor timestamp for relative snoozes when provided', () => {
    const now = new Date(2026, 2, 31, 13, 5, 0, 0);
    const scheduledFor = new Date(2026, 2, 31, 13, 0, 0, 0);

    const result = resolveSnoozeTime(
      'snooze_10_min',
      now,
      buildTask({
        id: 'task-5',
        nextNotificationAt: new Date(2026, 2, 31, 14, 0, 0, 0).toISOString()
      }),
      scheduledFor
    );

    expectLocalDateTime(result, 2026, 2, 31, 13, 10);
  });
});
