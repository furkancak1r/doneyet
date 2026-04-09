import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../constants/settings';
import { createBackupPayload, importBackupJson, parseBackupPayload, replaceBackupJson } from '../services/backupService';

const clearAppData = vi.fn();
const cancelNotifications = vi.fn();
const fetchAllTaskNotifications = vi.fn();
const fetchLists = vi.fn();
const fetchSettings = vi.fn();
const fetchTaskCompletionHistory = vi.fn();
const fetchTasks = vi.fn();
const saveList = vi.fn();
const saveSettings = vi.fn();
const saveTaskCompletionHistoryEntry = vi.fn();
const saveTask = vi.fn();
const restoreAllTaskSchedules = vi.fn();

vi.mock('../db/repositories', () => ({
  clearAppData: (...args: unknown[]) => clearAppData(...args),
  fetchAllTaskNotifications: (...args: unknown[]) => fetchAllTaskNotifications(...args),
  fetchLists: (...args: unknown[]) => fetchLists(...args),
  fetchSettings: (...args: unknown[]) => fetchSettings(...args),
  fetchTaskCompletionHistory: (...args: unknown[]) => fetchTaskCompletionHistory(...args),
  fetchTasks: (...args: unknown[]) => fetchTasks(...args),
  saveList: (...args: unknown[]) => saveList(...args),
  saveSettings: (...args: unknown[]) => saveSettings(...args),
  saveTaskCompletionHistoryEntry: (...args: unknown[]) => saveTaskCompletionHistoryEntry(...args),
  saveTask: (...args: unknown[]) => saveTask(...args)
}));

vi.mock('../services/schedulerService', () => ({
  restoreAllTaskSchedules: (...args: unknown[]) => restoreAllTaskSchedules(...args)
}));

vi.mock('../services/notificationService', () => ({
  cancelNotifications: (...args: unknown[]) => cancelNotifications(...args)
}));

describe('backup service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports backups with the new schema version', async () => {
    fetchLists.mockResolvedValue([
      {
        id: 'list-1',
        name: 'Work',
        color: '#116466',
        icon: 'briefcase-outline',
        sortOrder: 0,
        createdAt: '2025-03-01T00:00:00.000Z'
      }
    ]);
    fetchTasks.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Task',
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
      }
    ]);
    fetchSettings.mockResolvedValue(defaultSettings);
    fetchTaskCompletionHistory.mockResolvedValue([]);
    fetchAllTaskNotifications.mockResolvedValue([]);

    const payload = await createBackupPayload();

    expect(payload.schemaVersion).toBe(4);
    expect(payload.taskCompletionHistory).toEqual([]);
    expect('tagsJson' in payload.tasks[0]).toBe(false);
  });

  it('parses and imports legacy backups that still include tagsJson', async () => {
    const rawJson = JSON.stringify({
      schemaVersion: 2,
      exportedAt: '2025-03-01T00:00:00.000Z',
      lists: [
        {
          id: 'list-1',
          name: 'Work',
          color: '#116466',
          icon: 'briefcase-outline',
          sortOrder: 0,
          createdAt: '2025-03-01T00:00:00.000Z'
        }
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Task',
          tagsJson: '["important"]'
        }
      ],
      taskCompletionHistory: [],
      taskNotifications: [],
      settings: defaultSettings
    });

    const parsed = parseBackupPayload(rawJson);
    expect(parsed).not.toBeNull();
    expect(parsed?.tasks[0]).toMatchObject({ id: 'task-1', title: 'Task', tagsJson: '["important"]' });

    saveList.mockResolvedValue(undefined);
    saveSettings.mockResolvedValue(undefined);
    saveTaskCompletionHistoryEntry.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);
    restoreAllTaskSchedules.mockResolvedValue(undefined);

    await expect(importBackupJson(rawJson)).resolves.toEqual({ ok: true });
    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1', title: 'Task' }));
    expect(restoreAllTaskSchedules).toHaveBeenCalledWith(defaultSettings);
  });

  it('replaces the existing backup contents before importing new screenshot data', async () => {
    const rawJson = JSON.stringify({
      schemaVersion: 4,
      exportedAt: '2025-03-01T00:00:00.000Z',
      lists: [
        {
          id: 'list-1',
          name: 'Focus',
          color: '#116466',
          icon: 'briefcase-outline',
          sortOrder: 0,
          createdAt: '2025-03-01T00:00:00.000Z'
        }
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Task',
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
        }
      ],
      taskCompletionHistory: [
        {
          id: 'completion-1',
          taskId: 'task-1',
          taskTitleSnapshot: 'Task',
          taskDescriptionSnapshot: '',
          listId: 'list-1',
          listNameSnapshot: 'Focus',
          completedAt: '2025-03-02T09:00:00.000Z'
        }
      ],
      taskNotifications: [],
      settings: defaultSettings
    });

    fetchTasks.mockResolvedValue([
      {
        id: 'old-task',
        notificationIdsJson: '["notif-1"]'
      }
    ]);
    fetchAllTaskNotifications.mockResolvedValue([{ notificationId: 'notif-2' }]);
    clearAppData.mockResolvedValue(undefined);
    saveList.mockResolvedValue(undefined);
    saveSettings.mockResolvedValue(undefined);
    saveTaskCompletionHistoryEntry.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);
    restoreAllTaskSchedules.mockResolvedValue(undefined);
    cancelNotifications.mockResolvedValue(undefined);

    await expect(replaceBackupJson(rawJson)).resolves.toEqual({ ok: true });

    expect(cancelNotifications).toHaveBeenCalledWith(['notif-1', 'notif-2']);
    expect(clearAppData).toHaveBeenCalledTimes(1);
    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }));
    expect(saveTaskCompletionHistoryEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'completion-1', taskId: 'task-1' }));
  });

  it('imports orphaned completion history entries without requiring the original task or list rows', async () => {
    const rawJson = JSON.stringify({
      schemaVersion: 4,
      exportedAt: '2025-03-01T00:00:00.000Z',
      lists: [],
      tasks: [],
      taskCompletionHistory: [
        {
          id: 'completion-orphan',
          taskId: 'missing-task',
          taskTitleSnapshot: 'Archived task',
          taskDescriptionSnapshot: '',
          listId: 'missing-list',
          listNameSnapshot: 'Archived list',
          completedAt: '2025-03-02T09:00:00.000Z'
        }
      ],
      taskNotifications: [],
      settings: defaultSettings
    });

    saveSettings.mockResolvedValue(undefined);
    saveTaskCompletionHistoryEntry.mockResolvedValue(undefined);
    restoreAllTaskSchedules.mockResolvedValue(undefined);

    await expect(importBackupJson(rawJson)).resolves.toEqual({ ok: true });

    expect(saveTask).not.toHaveBeenCalled();
    expect(saveTaskCompletionHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'completion-orphan',
        taskId: 'missing-task',
        listId: 'missing-list'
      })
    );
  });

  it('ignores malformed completion history entries that are missing required snapshot fields', async () => {
    const rawJson = JSON.stringify({
      schemaVersion: 4,
      exportedAt: '2025-03-01T00:00:00.000Z',
      lists: [],
      tasks: [],
      taskCompletionHistory: [
        {
          id: 'completion-bad',
          taskId: 'task-1',
          completedAt: '2025-03-02T09:00:00.000Z'
        }
      ],
      taskNotifications: [],
      settings: defaultSettings
    });

    saveSettings.mockResolvedValue(undefined);
    restoreAllTaskSchedules.mockResolvedValue(undefined);

    await expect(importBackupJson(rawJson)).resolves.toEqual({ ok: true });

    expect(saveTaskCompletionHistoryEntry).not.toHaveBeenCalled();
  });
});
