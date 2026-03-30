import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreAllTaskSchedules, syncTaskSchedule } from '../services/schedulerService';
import { Task } from '../types/domain';

const fetchTaskById = vi.fn();
const fetchTaskNotifications = vi.fn();
const fetchTasks = vi.fn();
const replaceTaskNotifications = vi.fn();
const saveTask = vi.fn();
const scheduleTaskReminder = vi.fn();
const cancelNotifications = vi.fn();
const hasNotificationPermission = vi.fn();

vi.mock('../db/repositories', () => ({
  fetchTaskById: (...args: unknown[]) => fetchTaskById(...args),
  fetchTaskNotifications: (...args: unknown[]) => fetchTaskNotifications(...args),
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
    startDateTime: '2025-03-01T08:00:00.000Z',
    startReminderWeekday: null,
    startReminderDayOfMonth: null,
    startReminderTime: '08:00',
    startReminderUsesLastDay: 0,
    taskMode: 'single',
    repeatIntervalType: 'preset',
    repeatIntervalValue: 1,
    repeatIntervalUnit: 'hours',
    status: 'active',
    lastNotificationAt: null,
    nextNotificationAt: '2025-03-01T08:00:00.000Z',
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: null,
    ...rest
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
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
    fetchTaskNotifications.mockResolvedValue([]);
    cancelNotifications.mockResolvedValue(undefined);
    replaceTaskNotifications.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs schedules and keeps a single pending notification', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1, 7, 0, 0, 0));

    try {
      fetchTaskById.mockResolvedValue(
        buildTask({
          id: 'task-1',
          title: 'Tekrar eden görev',
          nextNotificationAt: '2025-03-01T08:00:00.000Z',
          notificationIdsJson: '["old-1","old-2"]'
        })
      );
      fetchTasks.mockResolvedValue([
        buildTask({
          id: 'task-1',
          title: 'Tekrar eden görev',
          nextNotificationAt: '2025-03-01T08:00:00.000Z',
          notificationIdsJson: '["old-1","old-2"]'
        })
      ]);
      scheduleTaskReminder.mockResolvedValue('new-notif');

      const result = await syncTaskSchedule('task-1');

      expect(cancelNotifications).toHaveBeenCalledWith(['old-1', 'old-2']);
      expect(scheduleTaskReminder).toHaveBeenCalledTimes(1);
      const [scheduledTask, scheduledAt] = scheduleTaskReminder.mock.calls[0];
      expect(scheduledTask.id).toBe('task-1');
      expectLocalDateTime(scheduledAt as Date, 2025, 2, 1, 11, 0);

      expect(replaceTaskNotifications).toHaveBeenCalledTimes(1);
      const rows = replaceTaskNotifications.mock.calls[0][1] as Array<{ notificationId: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].notificationId).toBe('new-notif');
      expect(saveTask).toHaveBeenCalledWith(
        expect.objectContaining({
          nextNotificationAt: '2025-03-01T08:00:00.000Z',
          notificationIdsJson: '["new-notif"]'
        })
      );
      expect(result?.status).toBe('active');
    } finally {
      vi.useRealTimers();
    }
  });

  it('schedules only once when the same task is resynced concurrently', async () => {
    const taskId = 'task-concurrent';
    const task = buildTask({
      id: taskId,
      title: 'Çakışan görev',
      startReminderType: 'today_at_time',
      startReminderTime: '08:00',
      nextNotificationAt: null,
      notificationIdsJson: '[]'
    });
    const taskFetch = createDeferred<Task | null>();
    const reminder = createDeferred<string>();
    fetchTaskById.mockReturnValue(taskFetch.promise);
    scheduleTaskReminder.mockReturnValue(reminder.promise);

    const firstSync = syncTaskSchedule(taskId);
    const secondSync = syncTaskSchedule(taskId);

    try {
      expect(fetchTaskById).toHaveBeenCalledTimes(1);
      taskFetch.resolve(task);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(1);

      reminder.resolve('new-notif');
      await Promise.all([firstSync, secondSync]);

      expect(replaceTaskNotifications).toHaveBeenCalledTimes(1);
      expect(saveTask).toHaveBeenCalledTimes(1);
    } finally {
      reminder.resolve('new-notif');
      taskFetch.resolve(task);
      await Promise.allSettled([firstSync, secondSync]);
    }
  });

  it('moves past today-at-time reminders to the next day before scheduling', async () => {
    vi.useFakeTimers();
    const reference = new Date(2025, 2, 1, 10, 0, 0, 0);
    vi.setSystemTime(reference);

    try {
      const startDateTime = new Date(2025, 2, 1, 9, 30, 0, 0);
      const task = buildTask({
        id: 'task-1',
        title: 'Günlük hatırlatma',
        startReminderType: 'today_at_time',
        startDateTime: startDateTime.toISOString(),
        startReminderTime: '09:30',
        nextNotificationAt: startDateTime.toISOString()
      });

      fetchTaskById.mockResolvedValue(task);
      fetchTasks.mockResolvedValue([task]);
      scheduleTaskReminder.mockResolvedValue('new-notif');

      const result = await syncTaskSchedule('task-1');

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(1);
      const scheduledOccurrence = scheduleTaskReminder.mock.calls[0][1] as Date;
      expectLocalDateTime(scheduledOccurrence, 2025, 2, 2, 9, 30);
      expect(result?.nextNotificationAt).toBeTruthy();
      expectLocalDateTime(new Date(result?.nextNotificationAt ?? ''), 2025, 2, 2, 9, 30);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a future monthly last-day reminder at 09:00 when creating the task', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 31, 0, 14, 0, 0));

    try {
      const task = buildTask({
        id: 'task-monthly',
        title: 'Ay sonu hatırlatma',
        startReminderType: 'monthly_on_last_day',
        startDateTime: new Date(2026, 2, 31, 0, 14, 0, 0).toISOString(),
        startReminderTime: '09:00',
        startReminderUsesLastDay: 1,
        nextNotificationAt: null
      });

      fetchTaskById.mockResolvedValue(task);
      scheduleTaskReminder.mockResolvedValue('monthly-notif');

      const result = await syncTaskSchedule('task-monthly');

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(1);
      const scheduledOccurrence = scheduleTaskReminder.mock.calls[0][1] as Date;
      expectLocalDateTime(scheduledOccurrence, 2026, 2, 31, 9, 0);
      expect(result?.nextNotificationAt).toBeTruthy();
      expectLocalDateTime(new Date(result?.nextNotificationAt ?? ''), 2026, 2, 31, 9, 0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels stale notification ids from both storage sources before rescheduling', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 31, 0, 14, 0, 0));

    try {
      const task = buildTask({
        id: 'task-cleanup',
        title: 'Temizlik',
        startReminderType: 'monthly_on_last_day',
        startDateTime: new Date(2026, 2, 31, 0, 14, 0, 0).toISOString(),
        startReminderTime: '09:00',
        startReminderUsesLastDay: 1,
        nextNotificationAt: null,
        notificationIdsJson: '["old-1","old-2"]'
      });

      fetchTaskById.mockResolvedValue(task);
      fetchTaskNotifications.mockResolvedValue([
        { notificationId: 'old-2' },
        { notificationId: 'old-3' }
      ]);
      scheduleTaskReminder.mockResolvedValue('new-notif');

      const result = await syncTaskSchedule('task-cleanup');

      expect(cancelNotifications).toHaveBeenCalledTimes(1);
      expect(cancelNotifications).toHaveBeenCalledWith(['old-1', 'old-2', 'old-3']);

      expect(scheduleTaskReminder).toHaveBeenCalledTimes(1);
      const scheduledOccurrence = scheduleTaskReminder.mock.calls[0][1] as Date;
      expectLocalDateTime(scheduledOccurrence, 2026, 2, 31, 9, 0);

      expect(replaceTaskNotifications).toHaveBeenCalledTimes(1);
      const rows = replaceTaskNotifications.mock.calls[0][1] as Array<{ notificationId: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].notificationId).toBe('new-notif');

      expect(saveTask).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationIdsJson: '["new-notif"]'
        })
      );
      expect(result?.nextNotificationAt).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores only active tasks on startup', async () => {
    const activeTask = buildTask({
      id: 'task-active',
      title: 'Aktif',
      nextNotificationAt: '2025-03-01T08:00:00.000Z'
    });
    const pausedTask = {
      ...activeTask,
      id: 'task-paused',
      title: 'Duraklatılmış',
      status: 'paused' as const
    };
    fetchTasks.mockResolvedValue([activeTask, pausedTask]);
    fetchTaskById.mockImplementation(async (id: string) => {
      if (id === 'task-active') {
        return activeTask;
      }

      if (id === 'task-paused') {
        return pausedTask;
      }

      return null;
    });
    scheduleTaskReminder.mockResolvedValue('new-notif');
    cancelNotifications.mockResolvedValue(undefined);
    replaceTaskNotifications.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);

    await restoreAllTaskSchedules();

    expect(scheduleTaskReminder).toHaveBeenCalledTimes(1);
  });
});
