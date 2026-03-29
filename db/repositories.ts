import { withDatabase } from '@/db/client';
import { mapListRow, mapNotificationRow, mapSettingsRow, mapTaskRow } from '@/db/mappers';
import { AppList, AppSettings, Task, TaskNotificationRow } from '@/types/domain';
import { stableStringify } from '@/utils/json';

export async function fetchLists(): Promise<AppList[]> {
  return withDatabase(async (db) => {
    const rows = (await db.getAllAsync('SELECT * FROM lists ORDER BY sortOrder ASC, createdAt ASC, name ASC')) as Record<string, unknown>[];
    return rows.map(mapListRow);
  });
}

export async function fetchListById(id: string): Promise<AppList | null> {
  return withDatabase(async (db) => {
    const row = (await db.getFirstAsync('SELECT * FROM lists WHERE id = ?', [id])) as Record<string, unknown> | null;
    return row ? mapListRow(row) : null;
  });
}

export async function saveList(list: AppList): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync(
      `INSERT INTO lists (id, name, color, icon, sortOrder, createdAt, seedKey, seedNameLocked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         color = excluded.color,
         icon = excluded.icon,
         sortOrder = excluded.sortOrder,
         seedKey = excluded.seedKey,
         seedNameLocked = excluded.seedNameLocked`,
      [list.id, list.name, list.color, list.icon, list.sortOrder, list.createdAt, list.seedKey ?? null, list.seedNameLocked ?? 0]
    );
  });
}

export async function deleteListRow(id: string): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync('DELETE FROM lists WHERE id = ?', [id]);
  });
}

export async function fetchTasks(): Promise<Task[]> {
  return withDatabase(async (db) => {
    const rows = (await db.getAllAsync('SELECT * FROM tasks ORDER BY sortOrder ASC, createdAt DESC, id ASC')) as Record<string, unknown>[];
    return rows.map(mapTaskRow);
  });
}

export async function fetchTaskById(id: string): Promise<Task | null> {
  return withDatabase(async (db) => {
    const row = (await db.getFirstAsync('SELECT * FROM tasks WHERE id = ?', [id])) as Record<string, unknown> | null;
    return row ? mapTaskRow(row) : null;
  });
}

export async function fetchTasksByList(listId: string): Promise<Task[]> {
  return withDatabase(async (db) => {
    const rows = (await db.getAllAsync('SELECT * FROM tasks WHERE listId = ? ORDER BY sortOrder ASC, createdAt DESC, id ASC', [listId])) as Record<string, unknown>[];
    return rows.map(mapTaskRow);
  });
}

export async function saveTask(task: Task): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync(
      `INSERT INTO tasks (
        id, title, description, listId, sortOrder, createdAt, updatedAt, startReminderType, startDateTime,
        startReminderWeekday, startReminderDayOfMonth, startReminderTime, startReminderUsesLastDay, taskMode,
        repeatIntervalType, repeatIntervalValue, repeatIntervalUnit, status, lastNotificationAt,
        nextNotificationAt, snoozedUntil, tagsJson, notificationIdsJson, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        listId = excluded.listId,
        updatedAt = excluded.updatedAt,
        sortOrder = excluded.sortOrder,
        startReminderType = excluded.startReminderType,
        startDateTime = excluded.startDateTime,
        startReminderWeekday = excluded.startReminderWeekday,
        startReminderDayOfMonth = excluded.startReminderDayOfMonth,
        startReminderTime = excluded.startReminderTime,
        startReminderUsesLastDay = excluded.startReminderUsesLastDay,
        taskMode = excluded.taskMode,
        repeatIntervalType = excluded.repeatIntervalType,
        repeatIntervalValue = excluded.repeatIntervalValue,
        repeatIntervalUnit = excluded.repeatIntervalUnit,
        status = excluded.status,
        lastNotificationAt = excluded.lastNotificationAt,
        nextNotificationAt = excluded.nextNotificationAt,
        snoozedUntil = excluded.snoozedUntil,
        tagsJson = excluded.tagsJson,
        notificationIdsJson = excluded.notificationIdsJson,
        completedAt = excluded.completedAt`,
      [
        task.id,
        task.title,
        task.description,
        task.listId,
        task.sortOrder,
        task.createdAt,
        task.updatedAt,
        task.startReminderType,
        task.startDateTime,
        task.startReminderWeekday,
        task.startReminderDayOfMonth,
        task.startReminderTime,
        task.startReminderUsesLastDay,
        task.taskMode,
        task.repeatIntervalType,
        task.repeatIntervalValue,
        task.repeatIntervalUnit,
        task.status,
        task.lastNotificationAt,
        task.nextNotificationAt,
        task.snoozedUntil,
        task.tagsJson,
        task.notificationIdsJson,
        task.completedAt
      ]
    );
  });
}

export async function fetchMaxListSortOrder(): Promise<number> {
  return withDatabase(async (db) => {
    const row = (await db.getFirstAsync('SELECT COALESCE(MAX(sortOrder), -1) AS maxSortOrder FROM lists')) as { maxSortOrder?: number } | null;
    return Number(row?.maxSortOrder ?? -1);
  });
}

export async function fetchMaxTaskSortOrderForList(listId: string): Promise<number> {
  return withDatabase(async (db) => {
    const row = (await db.getFirstAsync('SELECT COALESCE(MAX(sortOrder), -1) AS maxSortOrder FROM tasks WHERE listId = ?', [listId])) as { maxSortOrder?: number } | null;
    return Number(row?.maxSortOrder ?? -1);
  });
}

export async function deleteTaskRow(id: string): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  });
}

export async function fetchTaskNotifications(taskId: string): Promise<TaskNotificationRow[]> {
  return withDatabase(async (db) => {
    const rows = (await db.getAllAsync(
      'SELECT * FROM task_notifications WHERE taskId = ? ORDER BY scheduledFor ASC',
      [taskId]
    )) as Record<string, unknown>[];
    return rows.map(mapNotificationRow);
  });
}

export async function fetchAllTaskNotifications(): Promise<TaskNotificationRow[]> {
  return withDatabase(async (db) => {
    const rows = (await db.getAllAsync('SELECT * FROM task_notifications ORDER BY scheduledFor ASC')) as Record<string, unknown>[];
    return rows.map(mapNotificationRow);
  });
}

export async function replaceTaskNotifications(taskId: string, rows: Array<Omit<TaskNotificationRow, 'status' | 'createdAt'> & { status?: TaskNotificationRow['status']; createdAt?: string }>): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync('DELETE FROM task_notifications WHERE taskId = ?', [taskId]);
    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO task_notifications (id, taskId, notificationId, scheduledFor, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          taskId,
          row.notificationId,
          row.scheduledFor,
          row.status ?? 'scheduled',
          row.createdAt ?? new Date().toISOString()
        ]
      );
    }
  });
}

export async function deleteTaskNotifications(taskId: string): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync('DELETE FROM task_notifications WHERE taskId = ?', [taskId]);
  });
}

export async function fetchSettings(): Promise<AppSettings> {
  return withDatabase(async (db) => {
    const row = (await db.getFirstAsync('SELECT * FROM settings WHERE id = ?', ['singleton'])) as Record<string, unknown> | null;
    return mapSettingsRow(row ?? null);
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync('INSERT INTO settings (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value', [
      'singleton',
      stableStringify(settings)
    ]);
  });
}

export async function fetchTagsForTask(taskId: string): Promise<string[]> {
  return withDatabase(async (db) => {
    const rows = (await db.getAllAsync(
      `SELECT tags.name
       FROM tags
       INNER JOIN task_tags ON task_tags.tagId = tags.id
       WHERE task_tags.taskId = ?
       ORDER BY tags.name ASC`,
      [taskId]
    )) as Record<string, unknown>[];
    return rows.map((row: Record<string, unknown>) => String(row.name));
  });
}

export async function replaceTagsForTask(taskId: string, tagNames: string[]): Promise<void> {
  await withDatabase(async (db) => {
    await db.runAsync('DELETE FROM task_tags WHERE taskId = ?', [taskId]);
    for (const tagName of tagNames) {
      const tagId = `tag_${tagName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      await db.runAsync(
        `INSERT INTO tags (id, name, createdAt)
         VALUES (?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET name = excluded.name`,
        [tagId, tagName, new Date().toISOString()]
      );
      await db.runAsync('INSERT OR IGNORE INTO task_tags (taskId, tagId) VALUES (?, ?)', [taskId, tagId]);
    }
  });
}
