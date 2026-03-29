import { defaultSettings } from '@/constants/settings';
import {
  deleteTaskRow,
  deleteTaskNotifications,
  fetchMaxTaskSortOrderForList,
  fetchTaskById,
  fetchTasks,
  fetchTasksByList,
  saveTask,
  replaceTagsForTask
} from '@/db/repositories';
import { clearTaskSchedule, rescheduleTaskAfterMutation } from '@/services/schedulerService';
import { AppSettings, Task, TaskFormValues } from '@/types/domain';
import { createId } from '@/utils/id';
import { safeParseJson, stableStringify } from '@/utils/json';
import { getNextStartDateTime, toIso, normalizeTaskTags } from '@/utils/date';
import { mergeVisibleOrder, renumberSortOrders } from '@/utils/order';

function buildTaskFromValues(values: TaskFormValues, settings: AppSettings = defaultSettings, existing?: Task | null): Task {
  const now = new Date();
  const isTodo = values.taskMode === 'todo';
  const initialStart = isTodo
    ? existing?.startDateTime
      ? new Date(existing.startDateTime)
      : now
    : getNextStartDateTime(
        values.startReminderType,
        values.startDateTime,
        values.startReminderWeekday,
        values.startReminderDayOfMonth,
        values.startReminderTime,
        values.startReminderUsesLastDay,
        now
      );

  const createdAt = existing?.createdAt ?? now.toISOString();
  const updatedAt = now.toISOString();
  return {
    id: existing?.id ?? values.id ?? createId('task'),
    title: values.title.trim(),
    description: values.description.trim(),
    listId: values.listId,
    sortOrder: existing?.sortOrder ?? 0,
    createdAt,
    updatedAt,
    startReminderType: values.startReminderType,
    startDateTime: toIso(initialStart),
    startReminderWeekday: values.startReminderWeekday,
    startReminderDayOfMonth: values.startReminderDayOfMonth,
    startReminderTime: values.startReminderTime,
    startReminderUsesLastDay: values.startReminderUsesLastDay ? 1 : 0,
    taskMode: values.taskMode,
    repeatIntervalType: values.repeatIntervalType,
    repeatIntervalValue: values.repeatIntervalValue,
    repeatIntervalUnit: values.repeatIntervalUnit,
    status: existing?.status ?? 'active',
    lastNotificationAt: existing?.lastNotificationAt ?? null,
    nextNotificationAt: isTodo ? null : toIso(initialStart),
    snoozedUntil: existing?.snoozedUntil ?? null,
    tagsJson: stableStringify(normalizeTaskTags(values.tags)),
    notificationIdsJson: existing?.notificationIdsJson ?? stableStringify([]),
    completedAt: existing?.completedAt ?? null
  };
}

export async function listTasks(): Promise<Task[]> {
  return fetchTasks();
}

export async function getTask(taskId: string): Promise<Task | null> {
  return fetchTaskById(taskId);
}

export async function createTask(values: TaskFormValues, settings: AppSettings = defaultSettings): Promise<Task> {
  const sortOrder = (await fetchMaxTaskSortOrderForList(values.listId)) + 1;
  const task = buildTaskFromValues(values, settings);
  task.sortOrder = sortOrder;
  await saveTask(task);
  await replaceTagsForTask(task.id, safeTaskTags(task));
  return (await rescheduleTaskAfterMutation(task.id, settings)) ?? task;
}

export async function updateTask(taskId: string, values: TaskFormValues, settings: AppSettings = defaultSettings): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  const task = buildTaskFromValues({ ...values, id: taskId }, settings, existing);
  task.createdAt = existing.createdAt;
  task.status = existing.status;
  task.completedAt = existing.completedAt;
  task.lastNotificationAt = existing.lastNotificationAt;
  task.snoozedUntil = existing.snoozedUntil;
  task.sortOrder = existing.listId === values.listId ? existing.sortOrder : (await fetchMaxTaskSortOrderForList(values.listId)) + 1;
  await saveTask(task);
  await replaceTagsForTask(task.id, safeTaskTags(task));
  return (await rescheduleTaskAfterMutation(task.id, settings)) ?? task;
}

export async function reorderTasks(listId: string, taskIdsInOrder: string[]): Promise<void> {
  const existingTasks = await fetchTasksByList(listId);
  const orderedTasks = mergeVisibleOrder(existingTasks, taskIdsInOrder);
  const nextTasks = renumberSortOrders(orderedTasks);

  for (const task of nextTasks) {
    await saveTask(task);
  }
}

export async function completeTask(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  if (existing.taskMode === 'recurring') {
    await clearTaskSchedule(existing);
    const now = new Date();
    const nextCycleStart = getNextStartDateTime(
      existing.startReminderType,
      new Date(existing.startDateTime),
      existing.startReminderWeekday,
      existing.startReminderDayOfMonth,
      existing.startReminderTime,
      Boolean(existing.startReminderUsesLastDay),
      now
    );

    const updated: Task = {
      ...existing,
      status: 'active',
      completedAt: now.toISOString(),
      startDateTime: toIso(nextCycleStart),
      nextNotificationAt: toIso(nextCycleStart),
      snoozedUntil: null,
      notificationIdsJson: stableStringify([]),
      updatedAt: now.toISOString()
    };
    await saveTask(updated);
    return (await rescheduleTaskAfterMutation(taskId, settings)) ?? updated;
  }

  await clearTaskSchedule(existing);
  const updated: Task = {
    ...existing,
    status: 'completed',
    completedAt: new Date().toISOString(),
    nextNotificationAt: null,
    snoozedUntil: null,
    notificationIdsJson: stableStringify([]),
    updatedAt: new Date().toISOString()
  };
  await saveTask(updated);
  return updated;
}

export async function pauseTask(taskId: string): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  await clearTaskSchedule(existing);
  const updated: Task = {
    ...existing,
    status: 'paused',
    notificationIdsJson: stableStringify([]),
    updatedAt: new Date().toISOString()
  };
  await saveTask(updated);
  return updated;
}

export async function resumeTask(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  const updated: Task = {
    ...existing,
    status: 'active',
    completedAt: null,
    updatedAt: new Date().toISOString()
  };
  await saveTask(updated);
  return rescheduleTaskAfterMutation(taskId, settings);
}

export async function snoozeTask(taskId: string, snoozedUntil: Date, settings: AppSettings = defaultSettings): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  if (existing.taskMode === 'todo') {
    return existing;
  }

  const updated: Task = {
    ...existing,
    status: 'active',
    snoozedUntil: snoozedUntil.toISOString(),
    nextNotificationAt: snoozedUntil.toISOString(),
    lastNotificationAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await saveTask(updated);
  return rescheduleTaskAfterMutation(taskId, settings);
}

export async function removeTask(taskId: string): Promise<void> {
  const existing = await fetchTaskById(taskId);
  if (existing) {
    await clearTaskSchedule(existing);
  }
  await deleteTaskNotifications(taskId);
  await deleteTaskRow(taskId);
}

export async function reactivateCompletedTask(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  const updated: Task = {
    ...existing,
    status: 'active',
    completedAt: null,
    snoozedUntil: null,
    nextNotificationAt: null,
    updatedAt: new Date().toISOString()
  };

  await saveTask(updated);
  return rescheduleTaskAfterMutation(taskId, settings);
}

export async function taskExists(taskId: string): Promise<boolean> {
  return Boolean(await fetchTaskById(taskId));
}

export async function updateTaskTags(taskId: string, tags: string[]): Promise<void> {
  await replaceTagsForTask(taskId, normalizeTaskTags(tags));
}

export async function getTaskTags(taskId: string): Promise<string[]> {
  const task = await fetchTaskById(taskId);
  if (!task) {
    return [];
  }

  return safeTaskTags(task);
}

export function safeTaskTags(task: Task): string[] {
  return normalizeTaskTags(safeParseJson<string[]>(task.tagsJson || '[]', []));
}
