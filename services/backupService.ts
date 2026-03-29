import { fetchAllTaskNotifications, fetchLists, fetchSettings, fetchTasks, saveList, saveSettings, saveTask } from '@/db/repositories';
import { AppList, AppSettings, BackupPayload, Task } from '@/types/domain';
import { stableStringify } from '@/utils/json';
import { rescheduleTaskAfterMutation } from '@/services/schedulerService';
import i18n from '@/i18n';

function isAppList(value: unknown): value is AppList {
  return Boolean(value) && typeof value === 'object' && typeof (value as AppList).id === 'string' && typeof (value as AppList).name === 'string';
}

function isTask(value: unknown): value is Task {
  return Boolean(value) && typeof value === 'object' && typeof (value as Task).id === 'string' && typeof (value as Task).title === 'string';
}

function normalizeImportedTask(task: Task): Task {
  return {
    ...task,
    taskMode: task.taskMode ?? 'single',
    sortOrder: typeof task.sortOrder === 'number' ? task.sortOrder : 0
  };
}

function isSettings(value: unknown): value is AppSettings {
  return Boolean(value) && typeof value === 'object' && typeof (value as AppSettings).id === 'string';
}

export function exportBackupPayload(payload: BackupPayload): string {
  return stableStringify(payload);
}

export async function createBackupPayload(): Promise<BackupPayload> {
  const [lists, tasks, settings, taskNotifications] = await Promise.all([
    fetchLists(),
    fetchTasks(),
    fetchSettings(),
    fetchAllTaskNotifications()
  ]);

  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    lists,
    tasks,
    taskNotifications,
    settings
  };
}

export function parseBackupPayload(rawJson: string): BackupPayload | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<BackupPayload>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (!Array.isArray(parsed.lists) || !Array.isArray(parsed.tasks) || !isSettings(parsed.settings)) {
      return null;
    }

    if (!parsed.lists.every(isAppList) || !parsed.tasks.every(isTask)) {
      return null;
    }

    return {
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      lists: parsed.lists,
      tasks: parsed.tasks,
      taskNotifications: Array.isArray(parsed.taskNotifications) ? parsed.taskNotifications as BackupPayload['taskNotifications'] : [],
      settings: parsed.settings
    };
  } catch {
    return null;
  }
}

export async function importBackupPayload(payload: BackupPayload): Promise<void> {
  for (const [index, list] of payload.lists.entries()) {
    await saveList({
      ...list,
      sortOrder: typeof list.sortOrder === 'number' ? list.sortOrder : index
    });
  }

  await saveSettings(payload.settings);

  const taskOrderByList = new Map<string, number>();
  for (const task of payload.tasks) {
    const nextSortOrder = taskOrderByList.get(task.listId) ?? 0;
    await saveTask({
      ...normalizeImportedTask(task),
      sortOrder: typeof task.sortOrder === 'number' ? task.sortOrder : nextSortOrder
    });
    taskOrderByList.set(task.listId, nextSortOrder + 1);
  }

  for (const task of payload.tasks) {
    await rescheduleTaskAfterMutation(task.id, payload.settings);
  }
}

export async function importBackupJson(rawJson: string): Promise<{ ok: boolean; error?: string }> {
  const payload = parseBackupPayload(rawJson);
  if (!payload) {
    return { ok: false, error: String(i18n.t('errors.backupInvalid')) };
  }

  await importBackupPayload(payload);
  return { ok: true };
}
