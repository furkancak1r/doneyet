import { defaultSettings } from '@/constants/settings';
import { fetchTaskById, fetchTasks, replaceTaskNotifications, saveTask } from '@/db/repositories';
import { cancelNotifications, hasNotificationPermission, scheduleTaskReminder } from '@/services/notificationService';
import { AppSettings, Task } from '@/types/domain';
import { addRepeatInterval, getNextStartDateTime, toIso } from '@/utils/date';
import { createId } from '@/utils/id';
import { safeParseJson, stableStringify } from '@/utils/json';

const MAX_PENDING_NOTIFICATIONS = 60;
const MAX_HORIZON_DAYS = 30;

function parseTaskNotificationIds(task: Task): string[] {
  return safeParseJson<string[]>(task.notificationIdsJson, []);
}

function deriveAnchor(task: Task, now: Date): Date {
  if (task.snoozedUntil) {
    const snoozed = new Date(task.snoozedUntil);
    if (snoozed.getTime() > now.getTime()) {
      return snoozed;
    }
  }

  if (task.nextNotificationAt) {
    const next = new Date(task.nextNotificationAt);
    if (next.getTime() > now.getTime()) {
      return next;
    }
  }

  return getNextStartDateTime(
    task.startReminderType,
    new Date(task.startDateTime),
    task.startReminderWeekday,
    task.startReminderDayOfMonth,
    task.startReminderTime,
    Boolean(task.startReminderUsesLastDay),
    now
  );
}

export function calculatePendingSlots(activeTaskCount: number): number {
  const perTask = Math.floor(MAX_PENDING_NOTIFICATIONS / Math.max(activeTaskCount, 1));
  return Math.max(3, Math.min(15, perTask));
}

export function buildUpcomingOccurrences(task: Task, now: Date, maxCount: number): Date[] {
  const occurrences: Date[] = [];
  const anchor = deriveAnchor(task, now);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + MAX_HORIZON_DAYS);

  const intervalMs = Math.max(60_000, task.repeatIntervalValue * (task.repeatIntervalUnit === 'minutes' ? 60_000 : 3_600_000));
  let cursor = new Date(Math.max(anchor.getTime(), now.getTime()));
  while (occurrences.length < maxCount && cursor.getTime() <= horizon.getTime()) {
    occurrences.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + intervalMs);
  }

  return occurrences;
}

async function cancelExistingTaskNotifications(task: Task): Promise<void> {
  const ids = parseTaskNotificationIds(task);
  if (ids.length > 0) {
    await cancelNotifications(ids);
  }
}

export async function syncTaskSchedule(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  const task = await fetchTaskById(taskId);
  if (!task) {
    return null;
  }

  await cancelExistingTaskNotifications(task);

  if (task.taskMode === 'todo' || task.status !== 'active') {
    await replaceTaskNotifications(task.id, []);
    const cleared: Task = {
      ...task,
      nextNotificationAt: null,
      snoozedUntil: null,
      notificationIdsJson: stableStringify([]),
      updatedAt: new Date().toISOString()
    };
    await saveTask(cleared);
    return cleared;
  }

  const permissionAwareSettings = settings ?? defaultSettings;
  const now = new Date();
  const activeTasks = await fetchTasks();
  const pendingSlots = calculatePendingSlots(activeTasks.filter((item) => item.status === 'active' && item.taskMode !== 'todo').length);
  const upcomingOccurrences = buildUpcomingOccurrences(task, now, pendingSlots);
  const rows = [];
  const notificationIds: string[] = [];
  const canSchedule = await hasNotificationPermission();

  if (canSchedule) {
    for (const occurrence of upcomingOccurrences) {
      const notificationId = await scheduleTaskReminder(task, occurrence, Boolean(permissionAwareSettings.soundEnabled));
      notificationIds.push(notificationId);
      rows.push({
        id: createId('task_notif'),
        taskId: task.id,
        notificationId,
        scheduledFor: occurrence.toISOString(),
        createdAt: new Date().toISOString()
      });
    }
  }

  await replaceTaskNotifications(task.id, rows);

  const nextNotificationAt = upcomingOccurrences[0] ?? deriveAnchor(task, now);
  const updatedTask: Task = {
    ...task,
    nextNotificationAt: toIso(nextNotificationAt),
    snoozedUntil: task.snoozedUntil && new Date(task.snoozedUntil).getTime() > now.getTime() ? task.snoozedUntil : null,
    notificationIdsJson: stableStringify(notificationIds),
    updatedAt: new Date().toISOString()
  };

  await saveTask(updatedTask);
  return updatedTask;
}

export async function restoreAllTaskSchedules(settings: AppSettings = defaultSettings): Promise<void> {
  const tasks = await fetchTasks();
  const activeTasks = tasks.filter((task) => task.status === 'active');
  for (const task of activeTasks) {
    await syncTaskSchedule(task.id, settings);
  }
}

export async function rescheduleTaskAfterMutation(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  return syncTaskSchedule(taskId, settings);
}

export async function clearTaskSchedule(task: Task): Promise<void> {
  await cancelExistingTaskNotifications(task);
  await replaceTaskNotifications(task.id, []);
}

export function computeNextOccurrenceAfterNotification(task: Task, lastNotificationAt: Date): Date {
  return addRepeatInterval(lastNotificationAt, task.repeatIntervalValue, task.repeatIntervalUnit);
}

export function calculateImmediateNextNotification(task: Task, now = new Date()): Date {
  const anchor = deriveAnchor(task, now);
  return anchor.getTime() > now.getTime() ? anchor : now;
}
