import { defaultListSeeds } from '@/constants/theme';
import { defaultSettings } from '@/constants/settings';
import { createId } from '@/utils/id';
import { stableStringify } from '@/utils/json';
import { withDatabase, markDatabaseInitialized } from '@/db/client';
import { AppList } from '@/types/domain';
import i18n from '@/i18n';
import { resolveDefaultSeedKey } from '@/utils/defaultLists';

const taskTableColumns = `
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    listId TEXT NOT NULL,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    startReminderType TEXT NOT NULL,
    startDateTime TEXT NOT NULL,
    startReminderWeekday INTEGER,
    startReminderDayOfMonth INTEGER,
    startReminderTime TEXT NOT NULL,
    startReminderUsesLastDay INTEGER NOT NULL DEFAULT 0,
    taskMode TEXT NOT NULL DEFAULT 'single',
    repeatIntervalType TEXT NOT NULL,
    repeatIntervalValue INTEGER NOT NULL,
    repeatIntervalUnit TEXT NOT NULL,
    status TEXT NOT NULL,
    lastNotificationAt TEXT,
    nextNotificationAt TEXT,
    snoozedUntil TEXT,
    notificationIdsJson TEXT NOT NULL DEFAULT '[]',
    completedAt TEXT,
    FOREIGN KEY(listId) REFERENCES lists(id) ON DELETE CASCADE
  `;

const schemaStatements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    seedKey TEXT,
    seedNameLocked INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS tasks (
  ${taskTableColumns}
  );`,
  `CREATE TABLE IF NOT EXISTS task_notifications (
    id TEXT PRIMARY KEY NOT NULL,
    taskId TEXT NOT NULL,
    notificationId TEXT NOT NULL,
    scheduledFor TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    UNIQUE(taskId, scheduledFor),
    FOREIGN KEY(taskId) REFERENCES tasks(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`
];

async function ensureTaskModeColumn(): Promise<boolean> {
  const database = await withDatabase(async (db) => db);
  const columns = (await database.getAllAsync('PRAGMA table_info(tasks)')) as Record<string, unknown>[];
  const hasColumn = columns.some((column) => String(column.name) === 'taskMode');
  if (!hasColumn) {
    await database.execAsync(`ALTER TABLE tasks ADD COLUMN taskMode TEXT NOT NULL DEFAULT 'single';`);
    return true;
  }

  return false;
}

async function ensureListSortOrderColumn(): Promise<boolean> {
  const database = await withDatabase(async (db) => db);
  const columns = (await database.getAllAsync('PRAGMA table_info(lists)')) as Record<string, unknown>[];
  const hasColumn = columns.some((column) => String(column.name) === 'sortOrder');
  if (!hasColumn) {
    await database.execAsync(`ALTER TABLE lists ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;`);
    return true;
  }

  return false;
}

async function ensureListMetadataColumns(): Promise<boolean> {
  const database = await withDatabase(async (db) => db);
  const columns = (await database.getAllAsync('PRAGMA table_info(lists)')) as Record<string, unknown>[];
  let changed = false;

  if (!columns.some((column) => String(column.name) === 'seedKey')) {
    await database.execAsync(`ALTER TABLE lists ADD COLUMN seedKey TEXT;`);
    changed = true;
  }

  if (!columns.some((column) => String(column.name) === 'seedNameLocked')) {
    await database.execAsync(`ALTER TABLE lists ADD COLUMN seedNameLocked INTEGER NOT NULL DEFAULT 0;`);
    changed = true;
  }

  return changed;
}

async function ensureTaskSortOrderColumn(): Promise<boolean> {
  const database = await withDatabase(async (db) => db);
  const columns = (await database.getAllAsync('PRAGMA table_info(tasks)')) as Record<string, unknown>[];
  const hasColumn = columns.some((column) => String(column.name) === 'sortOrder');
  if (!hasColumn) {
    await database.execAsync(`ALTER TABLE tasks ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;`);
    return true;
  }

  return false;
}

async function cleanupLegacyTagSchema(): Promise<void> {
  const database = await withDatabase(async (db) => db);
  const columns = (await database.getAllAsync('PRAGMA table_info(tasks)')) as Record<string, unknown>[];
  const hasTagColumn = columns.some((column) => String(column.name) === 'tagsJson');

  await database.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await database.execAsync('BEGIN TRANSACTION;');
    try {
      await database.execAsync('DROP TABLE IF EXISTS tasks_new;');
      if (hasTagColumn) {
        await database.execAsync(
          `CREATE TABLE tasks_new (
  ${taskTableColumns}
  );`
        );
        await database.execAsync(
          `INSERT INTO tasks_new (
            id, title, description, listId, sortOrder, createdAt, updatedAt, startReminderType, startDateTime,
            startReminderWeekday, startReminderDayOfMonth, startReminderTime, startReminderUsesLastDay, taskMode,
            repeatIntervalType, repeatIntervalValue, repeatIntervalUnit, status, lastNotificationAt,
            nextNotificationAt, snoozedUntil, notificationIdsJson, completedAt
          )
          SELECT
            id, title, description, listId, sortOrder, createdAt, updatedAt, startReminderType, startDateTime,
            startReminderWeekday, startReminderDayOfMonth, startReminderTime, startReminderUsesLastDay, taskMode,
            repeatIntervalType, repeatIntervalValue, repeatIntervalUnit, status, lastNotificationAt,
            nextNotificationAt, snoozedUntil, notificationIdsJson, completedAt
          FROM tasks;`
        );
        await database.execAsync('DROP TABLE IF EXISTS tasks;');
        await database.execAsync('ALTER TABLE tasks_new RENAME TO tasks;');
      }

      await database.execAsync('DROP TABLE IF EXISTS task_tags;');
      await database.execAsync('DROP TABLE IF EXISTS tags;');
      await database.execAsync('COMMIT;');
    } catch (error) {
      await database.execAsync('ROLLBACK;');
      throw error;
    }
  } finally {
    await database.execAsync('PRAGMA foreign_keys = ON;');
  }
}

async function backfillListSortOrder(): Promise<void> {
  const database = await withDatabase(async (db) => db);
  const rows = (await database.getAllAsync('SELECT id FROM lists ORDER BY createdAt ASC, id ASC')) as Record<string, unknown>[];
  for (const [index, row] of rows.entries()) {
    await database.runAsync('UPDATE lists SET sortOrder = ? WHERE id = ?', [index, String(row.id)]);
  }
}

async function backfillTaskSortOrder(): Promise<void> {
  const database = await withDatabase(async (db) => db);
  const rows = (await database.getAllAsync(
    `SELECT id, listId
     FROM tasks
     ORDER BY listId ASC,
              CASE WHEN nextNotificationAt IS NULL THEN 1 ELSE 0 END ASC,
              nextNotificationAt ASC,
              createdAt DESC,
              id ASC`
  )) as Record<string, unknown>[];

  let currentListId: string | null = null;
  let sortIndex = 0;
  for (const row of rows) {
    const listId = String(row.listId);
    if (currentListId !== listId) {
      currentListId = listId;
      sortIndex = 0;
    }

    await database.runAsync('UPDATE tasks SET sortOrder = ? WHERE id = ?', [sortIndex, String(row.id)]);
    sortIndex += 1;
  }
}

async function seedLists(): Promise<void> {
  const database = await withDatabase(async (db) => db);
  const count = (await database.getFirstAsync('SELECT COUNT(*) as count FROM lists')) as { count?: number } | null;
  if ((count?.count ?? 0) > 0) {
    return;
  }

  const createdAt = new Date().toISOString();
  for (const [index, seed] of defaultListSeeds.entries()) {
    const list: AppList = {
      id: createId('list'),
      name: String(i18n.t(seed.nameKey)),
      color: seed.color,
      icon: seed.icon,
      sortOrder: index,
      createdAt,
      seedKey: seed.nameKey,
      seedNameLocked: 0
    };
    await database.runAsync(
      'INSERT INTO lists (id, name, color, icon, sortOrder, createdAt, seedKey, seedNameLocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [list.id, list.name, list.color, list.icon, list.sortOrder, list.createdAt, list.seedKey, list.seedNameLocked]
    );
  }
}

async function backfillListMetadata(): Promise<void> {
  const database = await withDatabase(async (db) => db);
  const rows = (await database.getAllAsync('SELECT id, name, color, icon FROM lists')) as Record<string, unknown>[];

  for (const row of rows) {
    const seedKey = resolveDefaultSeedKey({
      name: String(row.name),
      color: String(row.color),
      icon: String(row.icon)
    });

    if (!seedKey) {
      continue;
    }

    await database.runAsync('UPDATE lists SET seedKey = ?, seedNameLocked = 0 WHERE id = ?', [seedKey, String(row.id)]);
  }
}

async function seedSettings(): Promise<void> {
  const database = await withDatabase(async (db) => db);
  const count = (await database.getFirstAsync('SELECT COUNT(*) as count FROM settings')) as { count?: number } | null;
  if ((count?.count ?? 0) > 0) {
    return;
  }

  await database.runAsync('INSERT INTO settings (id, value) VALUES (?, ?)', ['singleton', stableStringify(defaultSettings)]);
}

export async function initializeDatabase(): Promise<void> {
  await withDatabase(async (database) => {
    for (const statement of schemaStatements) {
      await database.execAsync(statement);
    }
  });

  await ensureTaskModeColumn();
  const listSortOrderAdded = await ensureListSortOrderColumn();
  const taskSortOrderAdded = await ensureTaskSortOrderColumn();
  const listMetadataAdded = await ensureListMetadataColumns();
  await cleanupLegacyTagSchema();
  if (listSortOrderAdded) {
    await backfillListSortOrder();
  }
  if (taskSortOrderAdded) {
    await backfillTaskSortOrder();
  }
  if (listMetadataAdded) {
    await backfillListMetadata();
  }
  await seedLists();
  await seedSettings();
  markDatabaseInitialized();
}
