import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildUpcomingOccurrences, calculatePendingSlots, restoreAllTaskSchedules, syncTaskSchedule } from '../services/schedulerService';

const fetchTaskById = vi.fn();
const fetchTasks = vi.fn();
const replaceTaskNotifications = vi.fn();
const saveTask = vi.fn();
const scheduleTaskReminder = vi.fn();
const cancelNotifications = vi.fn();
const hasNotificationPermission = vi.fn();

vi.mock('../db/repositories', () => ({
  fetchTaskById: (...args: unknown[]) => fetchTaskById(...args),
  fetchTasks: (...args: unknown[]) => fetchTasks(...args),
  replaceTaskNotifications: (...args: unknown[]) => replaceTaskNotifications(...args),
  saveTask: (...args: unknown[]) => saveTask(...args)
}));

vi.mock('../services/notificationService', () => ({
  scheduleTaskReminder: (...args: unknown[]) => scheduleTaskReminder(...args),
  cancelNotifications: (...args: unknown[]) => cancelNotifications(...args),
  hasNotificationPermission: (...args: unknown[]) => hasNotificationPermission(...args)
}));

describe('scheduler service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasNotificationPermission.mockResolvedValue(true);
    fetchTasks.mockResolvedValue([]);
  });

  it('calculates a bounded number of pending slots', () => {
    expect(calculatePendingSlots(1)).toBeGreaterThanOrEqual(3);
    expect(calculatePendingSlots(10)).toBeLessThanOrEqual(15);
  });

  it('builds future occurrences in increasing order', () => {
    const occurrences = buildUpcomingOccurrences(
      {
        id: 'task-1',
        title: 'Test',
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
        tagsJson: '[]',
        notificationIdsJson: '[]',
        completedAt: null
      },
      new Date('2025-03-01T08:00:00.000Z'),
      3
    );

    expect(occurrences).toHaveLength(3);
    expect(occurrences[0].getTime()).toBeLessThan(occurrences[1].getTime());
    expect(occurrences[1].getTime()).toBeLessThan(occurrences[2].getTime());
  });

  it('syncs schedules and removes duplicate pending notifications', async () => {
    fetchTaskById.mockResolvedValue({
      id: 'task-1',
      title: 'Tekrar eden görev',
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
      tagsJson: '[]',
      notificationIdsJson: '["old-1","old-2"]',
      completedAt: null
    });
    fetchTasks.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Tekrar eden görev',
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
        tagsJson: '[]',
        notificationIdsJson: '["old-1","old-2"]',
        completedAt: null
      }
    ]);
    scheduleTaskReminder.mockResolvedValue('new-notif');
    cancelNotifications.mockResolvedValue(undefined);
    replaceTaskNotifications.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);

    const result = await syncTaskSchedule('task-1');

    expect(cancelNotifications).toHaveBeenCalledWith(['old-1', 'old-2']);
    expect(scheduleTaskReminder).toHaveBeenCalled();
    expect(replaceTaskNotifications).toHaveBeenCalled();
    expect(result?.status).toBe('active');
  });

  it('restores only active tasks on startup', async () => {
    const activeTask = {
      id: 'task-active',
      title: 'Aktif',
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
      tagsJson: '[]',
      notificationIdsJson: '[]',
      completedAt: null
    };
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

    expect(scheduleTaskReminder).toHaveBeenCalledTimes(calculatePendingSlots(1));
  });
});
