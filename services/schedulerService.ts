import { defaultSettings } from '@/constants/settings';
import { fetchAllTaskNotifications, fetchTasks, replaceTaskNotifications, saveTask } from '@/db/repositories';
import { cancelNotifications, hasNotificationPermission, scheduleTaskReminder } from '@/services/notificationService';
import { AppSettings, Task, TaskNotificationRow } from '@/types/domain';
import { addRepeatInterval, getNextTaskOccurrence, getNextStartDateTime, toIso } from '@/utils/date';
import { createId } from '@/utils/id';
import { safeParseJson, stableStringify } from '@/utils/json';

const MAX_PENDING_NOTIFICATIONS = 64;

let schedulerQueue: Promise<unknown> = Promise.resolve();

type ScheduledNotificationDraft = Omit<TaskNotificationRow, 'status' | 'createdAt'> & {
  status?: TaskNotificationRow['status'];
  createdAt?: string;
};

type TaskScheduleDraft = {
  notificationIds: string[];
  nextNotificationAt: string | null;
  rows: ScheduledNotificationDraft[];
  snoozedUntil: string | null;
};

type TaskOccurrenceCandidate = {
  scheduledFor: Date;
  task: Task;
};

function enqueueSchedulerOperation<T>(operation: () => Promise<T>): Promise<T> {
  const nextOperation = schedulerQueue.then(operation, operation);
  schedulerQueue = nextOperation.then(
    () => undefined,
    () => undefined
  );
  return nextOperation;
}

function parseTaskNotificationIds(task: Task): string[] {
  return safeParseJson<string[]>(task.notificationIdsJson, []);
}

function compareCandidates(left: TaskOccurrenceCandidate, right: TaskOccurrenceCandidate): number {
  const diff = left.scheduledFor.getTime() - right.scheduledFor.getTime();
  if (diff !== 0) {
    return diff;
  }

  return left.task.id.localeCompare(right.task.id);
}

function collectExistingNotificationIds(tasks: Task[], rows: TaskNotificationRow[]): string[] {
  const ids = new Set<string>();

  for (const task of tasks) {
    for (const id of parseTaskNotificationIds(task)) {
      ids.add(id);
    }
  }

  for (const row of rows) {
    if (row.notificationId) {
      ids.add(row.notificationId);
    }
  }

  return [...ids];
}

function groupTaskNotifications(rows: TaskNotificationRow[]): Map<string, TaskNotificationRow[]> {
  const byTaskId = new Map<string, TaskNotificationRow[]>();

  for (const row of rows) {
    const existing = byTaskId.get(row.taskId) ?? [];
    existing.push(row);
    byTaskId.set(row.taskId, existing);
  }

  return byTaskId;
}

function buildInitialTaskScheduleDraft(task: Task, now: Date): TaskScheduleDraft {
  if (task.taskMode === 'todo' || task.status !== 'active') {
    return {
      notificationIds: [],
      nextNotificationAt: null,
      rows: [],
      snoozedUntil: null
    };
  }

  const nextOccurrence = getNextTaskOccurrence(task, now);
  const snoozedUntil = task.snoozedUntil && new Date(task.snoozedUntil).getTime() > now.getTime() ? task.snoozedUntil : null;

  return {
    notificationIds: [],
    nextNotificationAt: toIso(nextOccurrence),
    rows: [],
    snoozedUntil
  };
}

async function rebuildTaskSchedules(settings: AppSettings = defaultSettings): Promise<Map<string, Task>> {
  const tasks = await fetchTasks();
  const existingRows = await fetchAllTaskNotifications();
  const existingRowsByTask = groupTaskNotifications(existingRows);
  const existingIds = collectExistingNotificationIds(tasks, existingRows);

  if (existingIds.length > 0) {
    await cancelNotifications(existingIds);
  }

  const now = new Date();
  const drafts = new Map<string, TaskScheduleDraft>();
  const candidates: TaskOccurrenceCandidate[] = [];

  for (const task of tasks) {
    const draft = buildInitialTaskScheduleDraft(task, now);
    drafts.set(task.id, draft);

    if (draft.nextNotificationAt) {
      candidates.push({
        task,
        scheduledFor: new Date(draft.nextNotificationAt)
      });
    }
  }

  const canSchedule = await hasNotificationPermission();

  if (canSchedule) {
    const soundEnabled = Boolean((settings ?? defaultSettings).soundEnabled);

    for (let scheduledCount = 0; scheduledCount < MAX_PENDING_NOTIFICATIONS && candidates.length > 0; scheduledCount += 1) {
      candidates.sort(compareCandidates);
      const candidate = candidates.shift();
      if (!candidate) {
        break;
      }

      const notificationId = await scheduleTaskReminder(candidate.task, candidate.scheduledFor, soundEnabled);
      const draft = drafts.get(candidate.task.id);
      if (!draft) {
        continue;
      }

      draft.notificationIds.push(notificationId);
      draft.rows.push({
        id: createId('task_notif'),
        taskId: candidate.task.id,
        notificationId,
        scheduledFor: candidate.scheduledFor.toISOString(),
        createdAt: new Date().toISOString()
      });

      candidates.push({
        task: candidate.task,
        scheduledFor: addRepeatInterval(candidate.scheduledFor, candidate.task.repeatIntervalValue, candidate.task.repeatIntervalUnit)
      });
    }
  }

  const updatedTasks = new Map<string, Task>();

  for (const task of tasks) {
    const draft = drafts.get(task.id) ?? {
      notificationIds: [],
      nextNotificationAt: null,
      rows: [],
      snoozedUntil: null
    };
    const previousRows = existingRowsByTask.get(task.id) ?? [];
    const shouldReplaceRows = previousRows.length > 0 || draft.rows.length > 0;
    const nextNotificationIdsJson = stableStringify(draft.notificationIds);
    const shouldSaveTask =
      task.nextNotificationAt !== draft.nextNotificationAt ||
      task.snoozedUntil !== draft.snoozedUntil ||
      task.notificationIdsJson !== nextNotificationIdsJson;

    if (shouldReplaceRows) {
      await replaceTaskNotifications(task.id, draft.rows);
    }

    if (shouldSaveTask) {
      const updatedTask: Task = {
        ...task,
        nextNotificationAt: draft.nextNotificationAt,
        snoozedUntil: draft.snoozedUntil,
        notificationIdsJson: nextNotificationIdsJson,
        updatedAt: new Date().toISOString()
      };
      await saveTask(updatedTask);
      updatedTasks.set(task.id, updatedTask);
    } else {
      updatedTasks.set(task.id, task);
    }
  }

  return updatedTasks;
}

export async function syncTaskSchedule(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  return enqueueSchedulerOperation(async () => {
    const updatedTasks = await rebuildTaskSchedules(settings);
    return updatedTasks.get(taskId) ?? null;
  });
}

export async function restoreAllTaskSchedules(settings: AppSettings = defaultSettings): Promise<void> {
  await enqueueSchedulerOperation(async () => {
    await rebuildTaskSchedules(settings);
  });
}

export async function rescheduleTaskAfterMutation(taskId: string, settings: AppSettings = defaultSettings): Promise<Task | null> {
  return syncTaskSchedule(taskId, settings);
}

export async function clearTaskSchedule(task: Task): Promise<void> {
  await enqueueSchedulerOperation(async () => {
    const existingRows = await fetchAllTaskNotifications();
    const notificationIds = new Set<string>(parseTaskNotificationIds(task));

    for (const row of existingRows) {
      if (row.taskId === task.id && row.notificationId) {
        notificationIds.add(row.notificationId);
      }
    }

    const uniqueIds = [...notificationIds];
    if (uniqueIds.length > 0) {
      await cancelNotifications(uniqueIds);
    }

    await replaceTaskNotifications(task.id, []);
  });
}

export function computeNextOccurrenceAfterNotification(task: Task, lastNotificationAt: Date): Date {
  return addRepeatInterval(lastNotificationAt, task.repeatIntervalValue, task.repeatIntervalUnit);
}

export function calculateImmediateNextNotification(task: Task, now = new Date()): Date {
  return getNextTaskOccurrence(task, now);
}

export function calculateNextCycleStart(task: Task, now = new Date()): Date {
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
