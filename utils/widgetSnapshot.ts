import i18n, { resolveAppLanguage } from '@/i18n';
import { AppList, AppSettings, Task } from '@/types/domain';
import { WidgetAction, WidgetSnapshot, WidgetTask, WidgetTaskState } from '@/types/widget';
import { addDays, getVisibleTaskState, isRecurringCycleDue, startOfDay } from '@/utils/date';

export const WIDGET_SNAPSHOT_SCHEMA_VERSION = 1;
export const WIDGET_MAX_TASKS = 8;

type BuildWidgetSnapshotInput = {
  tasks: Task[];
  lists: AppList[];
  settings: AppSettings;
  reference?: Date;
};

function getWidgetLocale(settings: AppSettings): WidgetSnapshot['locale'] {
  return resolveAppLanguage(settings.language);
}

type WidgetTranslate = (key: string, options?: Record<string, unknown>) => unknown;

function getTaskDueTime(task: Task): number {
  const value = task.nextNotificationAt ?? task.startDateTime;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function isActiveReminder(task: Task): boolean {
  return task.status === 'active' && task.taskMode !== 'todo';
}

function isTodayReminder(task: Task, reference: Date): boolean {
  if (!isActiveReminder(task) || !task.nextNotificationAt) {
    return false;
  }

  const nextAt = new Date(task.nextNotificationAt);
  if (Number.isNaN(nextAt.getTime())) {
    return false;
  }

  return nextAt >= startOfDay(reference) && nextAt < addDays(startOfDay(reference), 1);
}

function compareByDueAt(left: Task, right: Task): number {
  const diff = getTaskDueTime(left) - getTaskDueTime(right);
  return diff !== 0 ? diff : left.id.localeCompare(right.id);
}

function compareTodos(left: Task, right: Task): number {
  return right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id);
}

function getStateForTask(task: Task, reference: Date): WidgetTaskState {
  if (task.taskMode === 'todo') {
    return 'todo';
  }

  return getVisibleTaskState(task, reference) === 'overdue' ? 'overdue' : 'today';
}

function buildActionUrl(): string {
  return '';
}

function buildCompletionAction(task: Task, reference: Date, t: WidgetTranslate): WidgetAction | null {
  if (task.taskMode === 'todo') {
    return {
      type: 'complete',
      label: String(t('widget.actionDone')),
      url: buildActionUrl()
    };
  }

  if (task.taskMode === 'recurring') {
    if (!isRecurringCycleDue(task, reference)) {
      return null;
    }

    return {
      type: 'complete_cycle',
      label: String(t('widget.actionCompleteCycle')),
      url: buildActionUrl()
    };
  }

  return {
    type: 'complete_finish',
    label: String(t('widget.actionCompleteFinish')),
    url: buildActionUrl()
  };
}

function buildWidgetTask(task: Task, listsById: Map<string, AppList>, reference: Date, t: WidgetTranslate): WidgetTask {
  const list = listsById.get(task.listId);
  const completionAction = buildCompletionAction(task, reference, t);

  return {
    id: task.id,
    title: task.title,
    listName: list?.name ?? '',
    listColor: list?.color ?? '#116466',
    dueAt: task.taskMode === 'todo' ? null : task.nextNotificationAt ?? task.startDateTime,
    taskMode: task.taskMode,
    state: getStateForTask(task, reference),
    detailUrl: `doneyet://tasks/${encodeURIComponent(task.id)}`,
    actions: completionAction ? [completionAction] : []
  };
}

export function buildWidgetSnapshot({ tasks, lists, settings, reference = new Date() }: BuildWidgetSnapshotInput): WidgetSnapshot {
  const locale = getWidgetLocale(settings);
  const t = i18n.getFixedT(locale);
  const listsById = new Map(lists.map((list) => [list.id, list] as const));
  const overdueTasks = tasks
    .filter((task) => isActiveReminder(task) && getVisibleTaskState(task, reference) === 'overdue')
    .sort(compareByDueAt);
  const todayTasks = tasks
    .filter((task) => isTodayReminder(task, reference) && getVisibleTaskState(task, reference) !== 'overdue')
    .sort(compareByDueAt);
  const todoTasks = tasks.filter((task) => task.status === 'active' && task.taskMode === 'todo').sort(compareTodos);
  const visibleTasks = [...overdueTasks, ...todayTasks, ...todoTasks].slice(0, WIDGET_MAX_TASKS);

  return {
    schemaVersion: WIDGET_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: reference.toISOString(),
    locale,
    title: String(t('widget.title')),
    subtitle: String(
      t('widget.subtitle', {
        overdue: overdueTasks.length,
        today: todayTasks.length,
        todo: todoTasks.length
      })
    ),
    emptyTitle: String(t('widget.emptyTitle')),
    emptyDescription: String(t('widget.emptyDescription')),
    counts: {
      overdue: overdueTasks.length,
      today: todayTasks.length,
      todo: todoTasks.length
    },
    tasks: visibleTasks.map((task) => buildWidgetTask(task, listsById, reference, t))
  };
}

export function serializeWidgetSnapshot(snapshot: WidgetSnapshot): string {
  return JSON.stringify(snapshot);
}
