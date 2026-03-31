import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreAllTaskSchedules, syncTaskSchedule } from '../services/schedulerService';
import { Task } from '../types/domain';

const fetchAllTaskNotifications = vi.fn();
const fetchTasks = vi.fn();
const replaceTaskNotifications = vi.fn();
const saveTask = vi.fn();
const scheduleTaskReminder = vi.fn();
const cancelNotifications = vi.fn();
const hasNotificationPermission = vi.fn();

vi.mock('../db/repositories', () => ({
  fetchAllTaskNotifications: (...args: unknown[]) => fetchAllTaskNotifications(...args),
  fetchTasks: (...args: unknown[]) => fetchTasks(...args),
  replaceTaskNotifications: (...args: unknown[]) => replaceTaskNotifications(...args),
  saveTask: (...args: unknown[]) => saveTask(...args)
}));

vi.mock('../services/notificationService', () => ({
  scheduleTaskReminder: (...args: unknown[]) => scheduleTaskReminder(...args),
  cancelNotifications: (...args: unknown[]) => cancelNotifications(...args),
  hasNotificationPermission: (...args: unknown[]) => hasNotificationPermission(...args)
}));

function buildTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  const { id, ...rest } = overrides;
  return {
    id,
    title: 'Görev',
    description: '',
    listId: 'list-1',
    sortOrder: 0,
    createdAt: '2025-03-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
    startReminderType: 'today_at_time',
    startDateTime: '2025-03-01T20:20:00.000Z',
    startReminderWeekday: null,
    startReminderDayOfMonth: null,
    startReminderTime: '20:20',
    startReminderUsesLastDay: 0,
    taskMode: 'single',
    repeatIntervalType: 'preset',
    repeatIntervalValue: 30,
    repeatIntervalUnit: 'minutes',
    status: 'active',
    lastNotificationAt: null,
    nextNotificationAt: null,
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: null,
    ...rest
  };
}

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

describe('scheduler service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasNotificationPermission.mockResolvedValue(true);
    fetchTasks.mockResolvedValue([]);
    fetchAllTaskNotifications.mockResolvedValue([]);
    cancelNotifications.mockResolvedValue(undefined);
    replaceTaskNotifications.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);
    scheduleTaskReminder.mockImplementation(async (task: Task, fireAt: Date) => `${task.id}-${fireAt.toISOString()}`);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a rolling queue for repeating reminders', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1, 20, 10, 0, 0));

    try {
      fetchTasks.mockResolvedValue([
        buildTask({
          id: 'task-1'
        })
      ]);

      const result = await syncTaskSchedule('task-1');

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(64);
      expectLocalDateTime(scheduleTaskReminder.mock.calls[0][1] as Date, 2025, 2, 1, 20, 20);
      expectLocalDateTime(scheduleTaskReminder.mock.calls[1][1] as Date, 2025, 2, 1, 20, 50);
      expectLocalDateTime(scheduleTaskReminder.mock.calls[2][1] as Date, 2025, 2, 1, 21, 20);

      expect(replaceTaskNotifications).toHaveBeenCalledTimes(1);
      const rows = replaceTaskNotifications.mock.calls[0][1] as Array<{ scheduledFor: string }>;
      expect(rows).toHaveLength(64);
      expectLocalDateTime(new Date(rows[0].scheduledFor), 2025, 2, 1, 20, 20);
      expectLocalDateTime(new Date(rows[1].scheduledFor), 2025, 2, 1, 20, 50);
      expectLocalDateTime(new Date(rows[2].scheduledFor), 2025, 2, 1, 21, 20);

      expect(result?.nextNotificationAt).toBeTruthy();
      expectLocalDateTime(new Date(result?.nextNotificationAt ?? ''), 2025, 2, 1, 20, 20);
      expect(JSON.parse(result?.notificationIdsJson ?? '[]')).toHaveLength(64);
    } finally {
      vi.useRealTimers();
    }
  });

  it('advances past nextNotificationAt by repeat interval instead of resetting to tomorrow', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1, 20, 35, 0, 0));

    try {
      fetchTasks.mockResolvedValue([
        buildTask({
          id: 'task-1',
          nextNotificationAt: new Date(2025, 2, 1, 20, 20, 0, 0).toISOString()
        })
      ]);

      const result = await syncTaskSchedule('task-1');

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(64);
      expectLocalDateTime(scheduleTaskReminder.mock.calls[0][1] as Date, 2025, 2, 1, 20, 50);
      expect(result?.nextNotificationAt).toBeTruthy();
      expectLocalDateTime(new Date(result?.nextNotificationAt ?? ''), 2025, 2, 1, 20, 50);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shares the global queue across tasks by earliest due time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1, 20, 10, 0, 0));

    try {
      fetchTasks.mockResolvedValue([
        buildTask({
          id: 'task-a',
          startReminderTime: '20:20',
          startDateTime: new Date(2025, 2, 1, 20, 20, 0, 0).toISOString()
        }),
        buildTask({
          id: 'task-b',
          startReminderTime: '20:35',
          startDateTime: new Date(2025, 2, 1, 20, 35, 0, 0).toISOString()
        })
      ]);

      await syncTaskSchedule('task-a');

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(64);
      expect(scheduleTaskReminder.mock.calls.slice(0, 4).map(([task, fireAt]) => ({
        taskId: (task as Task).id,
        hour: (fireAt as Date).getHours(),
        minute: (fireAt as Date).getMinutes()
      }))).toEqual([
        { taskId: 'task-a', hour: 20, minute: 20 },
        { taskId: 'task-b', hour: 20, minute: 35 },
        { taskId: 'task-a', hour: 20, minute: 50 },
        { taskId: 'task-b', hour: 21, minute: 5 }
      ]);

      expect(replaceTaskNotifications).toHaveBeenCalledTimes(2);
      const rowsByTask = new Map(
        replaceTaskNotifications.mock.calls.map((call) => [call[0] as string, call[1] as Array<{ scheduledFor: string }>])
      );
      expect(rowsByTask.get('task-a')).toHaveLength(32);
      expect(rowsByTask.get('task-b')).toHaveLength(32);
    } finally {
      vi.useRealTimers();
    }
  });

  it('caps scheduled notifications at 64 while keeping nextNotificationAt for later tasks', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1, 8, 0, 0, 0));

    try {
      fetchTasks.mockResolvedValue(
        Array.from({ length: 65 }, (_, index) =>
          buildTask({
            id: `task-${index + 1}`,
            startReminderType: 'exact_date_time',
            startDateTime: new Date(2025, 2, 1, 8, index + 1, 0, 0).toISOString(),
            startReminderTime: `${String(8 + Math.floor((index + 1) / 60)).padStart(2, '0')}:${String((index + 1) % 60).padStart(2, '0')}`
          })
        )
      );

      const result = await syncTaskSchedule('task-65');

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(64);
      expect(scheduleTaskReminder.mock.calls.some(([task]) => (task as Task).id === 'task-65')).toBe(false);
      expect(result?.nextNotificationAt).toBe(new Date(2025, 2, 1, 9, 5, 0, 0).toISOString());
      expect(result?.notificationIdsJson).toBe('[]');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels stale notification ids from tasks and notification rows before rebuilding', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1, 20, 10, 0, 0));

    try {
      fetchTasks.mockResolvedValue([
        buildTask({
          id: 'task-1',
          notificationIdsJson: '["old-1","old-2"]'
        })
      ]);
      fetchAllTaskNotifications.mockResolvedValue([
        {
          id: 'row-1',
          taskId: 'task-1',
          notificationId: 'old-2',
          scheduledFor: new Date(2025, 2, 1, 20, 20, 0, 0).toISOString(),
          status: 'scheduled',
          createdAt: new Date(2025, 2, 1, 19, 50, 0, 0).toISOString()
        },
        {
          id: 'row-2',
          taskId: 'task-1',
          notificationId: 'old-3',
          scheduledFor: new Date(2025, 2, 1, 20, 50, 0, 0).toISOString(),
          status: 'scheduled',
          createdAt: new Date(2025, 2, 1, 19, 55, 0, 0).toISOString()
        }
      ]);

      await syncTaskSchedule('task-1');

      expect(cancelNotifications).toHaveBeenCalledTimes(1);
      expect(cancelNotifications).toHaveBeenCalledWith(['old-1', 'old-2', 'old-3']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores schedules with the shared queue on startup', async () => {
    fetchTasks.mockResolvedValue([
      buildTask({
        id: 'task-active'
      })
    ]);

    await restoreAllTaskSchedules();

    expect(scheduleTaskReminder).toHaveBeenCalledTimes(64);
  });
});
