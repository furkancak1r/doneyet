import { defaultSettings } from '@/constants/settings';
import {
  fetchListById,
  deleteTaskRow,
  deleteTaskNotifications,
  fetchMaxTaskSortOrderForList,
  fetchTaskById,
  fetchTasks,
  fetchTasksByList,
  saveTask,
  saveTaskCompletionHistoryEntry
} from '@/db/repositories';
import { clearTaskSchedule, rescheduleTaskAfterMutation } from '@/services/schedulerService';
import { AppSettings, Task, TaskCompletionHistoryEntry, TaskFormValues } from '@/types/domain';
import { createId } from '@/utils/id';
import { stableStringify } from '@/utils/json';
import { getNextStartDateTime, toIso } from '@/utils/date';
import { mergeVisibleOrder, renumberSortOrders } from '@/utils/order';

function buildTaskFromValues(values: TaskFormValues, existing?: Task | null): Task {
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
    notificationIdsJson: existing?.notificationIdsJson ?? stableStringify([]),
    completedAt: existing?.completedAt ?? null
  };
}

async function buildCompletionHistoryEntry(task: Task, completedAt: string): Promise<TaskCompletionHistoryEntry> {
  const list = await fetchListById(task.listId);
  return {
    id: createId('completion'),
    taskId: task.id,
    taskTitleSnapshot: task.title,
    taskDescriptionSnapshot: task.description,
    taskModeSnapshot: task.taskMode,
    listId: task.listId,
    listNameSnapshot: list?.name ?? '',
    completedAt
  };
}

async function saveTaskCompletionHistory(task: Task, completedAt: string): Promise<void> {
  const completionHistoryEntry = await buildCompletionHistoryEntry(task, completedAt);
  await saveTaskCompletionHistoryEntry(completionHistoryEntry);
}

async function markTaskCompleted(existing: Task, completedAt = new Date().toISOString()): Promise<Task> {
  await clearTaskSchedule(existing);
  const updated: Task = {
    ...existing,
    status: 'completed',
    completedAt,
    nextNotificationAt: null,
    snoozedUntil: null,
    notificationIdsJson: stableStringify([]),
    updatedAt: completedAt
  };
  await saveTask(updated);
  return updated;
}

export async function listTasks(): Promise<Task[]> {
  return fetchTasks();
}

export async function getTask(taskId: string): Promise<Task | null> {
  return fetchTaskById(taskId);
}

export async function createTask(values: TaskFormValues, settings: AppSettings = defaultSettings): Promise<Task> {
  const sortOrder = (await fetchMaxTaskSortOrderForList(values.listId)) + 1;
  const task = buildTaskFromValues(values);
  task.sortOrder = sortOrder;
  await saveTask(task);
  return (await rescheduleTaskAfterMutation(task.id, settings)) ?? task;
}

export async function updateTask(taskId: string, values: TaskFormValues, settings: AppSettings = defaultSettings): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  const task = buildTaskFromValues({ ...values, id: taskId }, existing);
  task.createdAt = existing.createdAt;
  task.status = existing.status;
  task.completedAt = existing.completedAt;
  task.lastNotificationAt = existing.lastNotificationAt;
  task.snoozedUntil = existing.snoozedUntil;
  task.sortOrder = existing.listId === values.listId ? existing.sortOrder : (await fetchMaxTaskSortOrderForList(values.listId)) + 1;
  await saveTask(task);
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
    const completedAt = now.toISOString();
    await saveTaskCompletionHistory(existing, completedAt);
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
      completedAt,
      startDateTime: toIso(nextCycleStart),
      nextNotificationAt: toIso(nextCycleStart),
      snoozedUntil: null,
      notificationIdsJson: stableStringify([]),
      updatedAt: now.toISOString()
    };
    await saveTask(updated);
    return (await rescheduleTaskAfterMutation(taskId, settings)) ?? updated;
  }

  return markTaskCompleted(existing);
}

export async function completeTaskPermanently(taskId: string): Promise<Task | null> {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  if (existing.taskMode === 'recurring') {
    if (existing.status === 'completed') {
      return existing;
    }

    const completedAt = new Date().toISOString();
    await saveTaskCompletionHistory(existing, completedAt);
    return markTaskCompleted(existing, completedAt);
  }

  return markTaskCompleted(existing);
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
    if (existing.status === 'completed' && existing.taskMode !== 'recurring') {
      await saveTaskCompletionHistory(existing, existing.completedAt ?? new Date().toISOString());
    }
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
