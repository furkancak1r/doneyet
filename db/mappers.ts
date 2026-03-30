import { AppList, AppSettings, Task, TaskNotificationRow } from '@/types/domain';
import { defaultSettings } from '@/constants/settings';
import { safeParseJson } from '@/utils/json';

export function mapListRow(row: Record<string, unknown>): AppList {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    icon: String(row.icon),
    sortOrder: row.sortOrder === null || row.sortOrder === undefined ? 0 : Number(row.sortOrder),
    createdAt: String(row.createdAt),
    seedKey: row.seedKey === null || row.seedKey === undefined ? null : String(row.seedKey),
    seedNameLocked: row.seedNameLocked === null || row.seedNameLocked === undefined ? 0 : (Number(row.seedNameLocked) as 0 | 1)
  };
}

export function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ''),
    listId: String(row.listId),
    sortOrder: row.sortOrder === null || row.sortOrder === undefined ? 0 : Number(row.sortOrder),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    startReminderType: String(row.startReminderType) as Task['startReminderType'],
    startDateTime: String(row.startDateTime),
    startReminderWeekday: row.startReminderWeekday === null || row.startReminderWeekday === undefined ? null : Number(row.startReminderWeekday),
    startReminderDayOfMonth: row.startReminderDayOfMonth === null || row.startReminderDayOfMonth === undefined ? null : Number(row.startReminderDayOfMonth),
    startReminderTime: String(row.startReminderTime),
    startReminderUsesLastDay: Number(row.startReminderUsesLastDay) as 0 | 1,
    taskMode: String(row.taskMode ?? 'single') as Task['taskMode'],
    repeatIntervalType: String(row.repeatIntervalType) as Task['repeatIntervalType'],
    repeatIntervalValue: Number(row.repeatIntervalValue),
    repeatIntervalUnit: String(row.repeatIntervalUnit) as Task['repeatIntervalUnit'],
    status: String(row.status) as Task['status'],
    lastNotificationAt: row.lastNotificationAt ? String(row.lastNotificationAt) : null,
    nextNotificationAt: row.nextNotificationAt ? String(row.nextNotificationAt) : null,
    snoozedUntil: row.snoozedUntil ? String(row.snoozedUntil) : null,
    notificationIdsJson: String(row.notificationIdsJson ?? '[]'),
    completedAt: row.completedAt ? String(row.completedAt) : null
  };
}

export function mapNotificationRow(row: Record<string, unknown>): TaskNotificationRow {
  return {
    id: String(row.id),
    taskId: String(row.taskId),
    notificationId: String(row.notificationId),
    scheduledFor: String(row.scheduledFor),
    status: String(row.status) as TaskNotificationRow['status'],
    createdAt: String(row.createdAt)
  };
}

export function mapSettingsRow(row: Record<string, unknown> | null): AppSettings {
  if (!row) {
    return defaultSettings;
  }

  const value = safeParseJson<AppSettings>(String(row.value), defaultSettings);
  return {
    ...defaultSettings,
    ...value,
    id: 'singleton'
  };
}
