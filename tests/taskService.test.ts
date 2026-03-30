import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeTask, createTask, reactivateCompletedTask, reorderTasks, snoozeTask } from '../services/taskService';

const saveTask = vi.fn();
const fetchTaskById = vi.fn();
const fetchMaxTaskSortOrderForList = vi.fn();
const fetchTasksByList = vi.fn();
const deleteTaskNotifications = vi.fn();
const deleteTaskRow = vi.fn();
const clearTaskSchedule = vi.fn();
const rescheduleTaskAfterMutation = vi.fn();

vi.mock('../db/repositories', () => ({
  fetchTaskById: (...args: unknown[]) => fetchTaskById(...args),
  fetchMaxTaskSortOrderForList: (...args: unknown[]) => fetchMaxTaskSortOrderForList(...args),
  fetchTasksByList: (...args: unknown[]) => fetchTasksByList(...args),
  saveTask: (...args: unknown[]) => saveTask(...args),
  deleteTaskNotifications: (...args: unknown[]) => deleteTaskNotifications(...args),
  deleteTaskRow: (...args: unknown[]) => deleteTaskRow(...args)
}));

vi.mock('../services/schedulerService', () => ({
  clearTaskSchedule: (...args: unknown[]) => clearTaskSchedule(...args),
  rescheduleTaskAfterMutation: (...args: unknown[]) => rescheduleTaskAfterMutation(...args)
}));

describe('task service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMaxTaskSortOrderForList.mockResolvedValue(-1);
  });

  it('completing a task cancels notifications and marks the task completed', async () => {
    fetchTaskById.mockResolvedValue({
      id: 'task-1',
      title: 'Elektrik faturası',
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
      notificationIdsJson: '["notif-1"]',
      completedAt: null
    });
    clearTaskSchedule.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);

    const updated = await completeTask('task-1');

    expect(clearTaskSchedule).toHaveBeenCalledTimes(1);
    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', completedAt: expect.any(String), nextNotificationAt: null }));
    expect(updated?.status).toBe('completed');
  });

  it('snooze updates the next reminder and reuses the scheduler', async () => {
    fetchTaskById.mockResolvedValue({
      id: 'task-1',
      title: 'Spor',
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
      completedAt: null
    });
    saveTask.mockResolvedValue(undefined);
    rescheduleTaskAfterMutation.mockResolvedValue({ status: 'active' });

    const snoozedAt = new Date('2025-03-01T10:10:00.000Z');
    const updated = await snoozeTask('task-1', snoozedAt);

    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ snoozedUntil: snoozedAt.toISOString(), nextNotificationAt: snoozedAt.toISOString() }));
    expect(rescheduleTaskAfterMutation).toHaveBeenCalledWith('task-1', expect.any(Object));
    expect(updated).toBeTruthy();
  });

  it('reactivating a completed task clears completion state', async () => {
    fetchTaskById.mockResolvedValue({
      id: 'task-1',
      title: 'Rapor',
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
      status: 'completed',
      lastNotificationAt: null,
      nextNotificationAt: null,
      snoozedUntil: null,
      notificationIdsJson: '[]',
      completedAt: '2025-03-01T09:00:00.000Z'
    });
    saveTask.mockResolvedValue(undefined);
    rescheduleTaskAfterMutation.mockResolvedValue({ status: 'active' });

    await reactivateCompletedTask('task-1');

    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', completedAt: null, snoozedUntil: null }));
  });

  it('completing a recurring task advances to the next cycle instead of closing it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-31T10:00:00.000Z'));
    try {
      fetchTaskById.mockResolvedValue({
        id: 'task-2',
        title: 'Kredi kartı ekstresi',
        description: '',
        listId: 'list-1',
        sortOrder: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        startReminderType: 'monthly_on_last_day',
        startDateTime: '2025-01-31T09:00:00.000Z',
        startReminderWeekday: null,
        startReminderDayOfMonth: null,
        startReminderTime: '09:00',
        startReminderUsesLastDay: 1,
        taskMode: 'recurring',
        repeatIntervalType: 'preset',
        repeatIntervalValue: 1,
        repeatIntervalUnit: 'hours',
        status: 'active',
        lastNotificationAt: null,
        nextNotificationAt: '2025-01-31T09:00:00.000Z',
        snoozedUntil: null,
        notificationIdsJson: '["notif-1"]',
        completedAt: null
      });
      clearTaskSchedule.mockResolvedValue(undefined);
      saveTask.mockResolvedValue(undefined);
      rescheduleTaskAfterMutation.mockResolvedValue({ status: 'active' });

      const updated = await completeTask('task-2');

      expect(clearTaskSchedule).toHaveBeenCalledTimes(1);
      expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', taskMode: 'recurring', completedAt: expect.any(String), startDateTime: expect.stringMatching(/^2025-02-/) }));
      expect(updated?.status).toBe('active');
    } finally {
      vi.useRealTimers();
    }
  });

  it('creates tasks at the end of the target list', async () => {
    fetchMaxTaskSortOrderForList.mockResolvedValue(2);
    saveTask.mockResolvedValue(undefined);

    await createTask({
      title: 'Yeni görev',
      description: '',
      listId: 'list-1',
      startReminderType: 'today_at_time',
      startDateTime: new Date('2025-03-01T08:00:00.000Z'),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '08:00',
      startReminderUsesLastDay: false,
      taskMode: 'todo',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 1,
      repeatIntervalUnit: 'hours'
    });

    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 3, listId: 'list-1' }));
  });

  it('reorders tasks while preserving hidden positions', async () => {
    fetchTasksByList.mockResolvedValue([
      {
        id: 'task-1',
        title: 'A',
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
        completedAt: null
      },
      {
        id: 'task-2',
        title: 'Hidden',
        description: '',
        listId: 'list-1',
        sortOrder: 1,
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
        status: 'completed',
        lastNotificationAt: null,
        nextNotificationAt: null,
        snoozedUntil: null,
        notificationIdsJson: '[]',
        completedAt: '2025-03-01T09:00:00.000Z'
      },
      {
        id: 'task-3',
        title: 'C',
        description: '',
        listId: 'list-1',
        sortOrder: 2,
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
        completedAt: null
      }
    ]);
    saveTask.mockResolvedValue(undefined);

    await reorderTasks('list-1', ['task-3', 'task-1']);

    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-3', sortOrder: 0 }));
    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-2', sortOrder: 1 }));
    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1', sortOrder: 2 }));
  });
});
