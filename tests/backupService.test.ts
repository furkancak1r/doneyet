import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../constants/settings';
import { createBackupPayload, importBackupJson, parseBackupPayload } from '../services/backupService';

const fetchAllTaskNotifications = vi.fn();
const fetchLists = vi.fn();
const fetchSettings = vi.fn();
const fetchTasks = vi.fn();
const saveList = vi.fn();
const saveSettings = vi.fn();
const saveTask = vi.fn();
const rescheduleTaskAfterMutation = vi.fn();

vi.mock('../db/repositories', () => ({
  fetchAllTaskNotifications: (...args: unknown[]) => fetchAllTaskNotifications(...args),
  fetchLists: (...args: unknown[]) => fetchLists(...args),
  fetchSettings: (...args: unknown[]) => fetchSettings(...args),
  fetchTasks: (...args: unknown[]) => fetchTasks(...args),
  saveList: (...args: unknown[]) => saveList(...args),
  saveSettings: (...args: unknown[]) => saveSettings(...args),
  saveTask: (...args: unknown[]) => saveTask(...args)
}));

vi.mock('../services/schedulerService', () => ({
  rescheduleTaskAfterMutation: (...args: unknown[]) => rescheduleTaskAfterMutation(...args)
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
    fetchAllTaskNotifications.mockResolvedValue([]);

    const payload = await createBackupPayload();

    expect(payload.schemaVersion).toBe(3);
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
      taskNotifications: [],
      settings: defaultSettings
    });

    const parsed = parseBackupPayload(rawJson);
    expect(parsed).not.toBeNull();
    expect(parsed?.tasks[0]).toMatchObject({ id: 'task-1', title: 'Task', tagsJson: '["important"]' });

    saveList.mockResolvedValue(undefined);
    saveSettings.mockResolvedValue(undefined);
    saveTask.mockResolvedValue(undefined);
    rescheduleTaskAfterMutation.mockResolvedValue({ status: 'active' });

    await expect(importBackupJson(rawJson)).resolves.toEqual({ ok: true });
    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1', title: 'Task' }));
  });
});
