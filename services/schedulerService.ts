import { defaultSettings } from '@/constants/settings';
import { fetchTaskById, fetchTaskNotifications, fetchTasks, replaceTaskNotifications, saveTask } from '@/db/repositories';
import { cancelNotifications, hasNotificationPermission, scheduleTaskReminder } from '@/services/notificationService';
import { AppSettings, Task } from '@/types/domain';
import { addRepeatInterval, getNextStartDateTime, toIso } from '@/utils/date';
import { createId } from '@/utils/id';
import { safeParseJson, stableStringify } from '@/utils/json';

const scheduleLocks = new Map<string, Promise<unknown>>();

function parseTaskNotificationIds(task: Task): string[] {
  return safeParseJson<string[]>(task.notificationIdsJson, []);
}

async function withTaskScheduleLock<T>(taskId: string, operation: () => Promise<T>): Promise<T> {
  const existing = scheduleLocks.get(taskId);
  if (existing) {
    return existing as Promise<T>;
  }

  const taskPromise = operation();
  scheduleLocks.set(taskId, taskPromise as Promise<unknown>);

  try {
    return await taskPromise;
  } finally {
    if (scheduleLocks.get(taskId) === taskPromise) {
      scheduleLocks.delete(taskId);
    }
  }
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

async function cancelExistingTaskNotifications(task: Task): Promise<void> {
  const ids = new Set<string>(parseTaskNotificationIds(task));
  const rows = await fetchTaskNotifications(task.id);
  for (const row of rows) {
    if (row.notificationId) {
      ids.add(row.notificationId);
    }
  }

  const uniqueIds = [...ids];
  if (uniqueIds.length > 0) {
    await cancelNotifications(uniqueIds);
  }
}

export async function syncTaskSchedule(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  return withTaskScheduleLock(taskId, async () => {
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
    const nextNotificationAt = calculateImmediateNextNotification(task, now);
    const rows: Array<{
      id: string;
      taskId: string;
      notificationId: string;
      scheduledFor: string;
      createdAt: string;
    }> = [];
    const notificationIds: string[] = [];
    const canSchedule = await hasNotificationPermission();

    if (canSchedule) {
      const notificationId = await scheduleTaskReminder(task, nextNotificationAt, Boolean(permissionAwareSettings.soundEnabled));
      notificationIds.push(notificationId);
      rows.push({
        id: createId('task_notif'),
        taskId: task.id,
        notificationId,
        scheduledFor: nextNotificationAt.toISOString(),
        createdAt: new Date().toISOString()
      });
    }

    await replaceTaskNotifications(task.id, rows);

    const updatedTask: Task = {
      ...task,
      nextNotificationAt: toIso(nextNotificationAt),
      snoozedUntil: task.snoozedUntil && new Date(task.snoozedUntil).getTime() > now.getTime() ? task.snoozedUntil : null,
      notificationIdsJson: stableStringify(notificationIds),
      updatedAt: new Date().toISOString()
    };

    await saveTask(updatedTask);
    return updatedTask;
  });
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
  await withTaskScheduleLock(task.id, async () => {
    await cancelExistingTaskNotifications(task);
    await replaceTaskNotifications(task.id, []);
  });
}

export function computeNextOccurrenceAfterNotification(task: Task, lastNotificationAt: Date): Date {
  return addRepeatInterval(lastNotificationAt, task.repeatIntervalValue, task.repeatIntervalUnit);
}

export function calculateImmediateNextNotification(task: Task, now = new Date()): Date {
  return deriveAnchor(task, now);
}
