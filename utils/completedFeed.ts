import { AppList, Task, TaskCompletionHistoryEntry, TaskMode } from '@/types/domain';
import { addDays, startOfDay } from '@/utils/date';

export type CompletedFeedItemKind = 'task' | 'cycle';
export type CompletedFeedModeFilter = 'all' | 'reminder' | 'todo' | 'cycles';
export type CompletedDateFilter = 'today' | 'last7' | 'last30' | 'all' | 'custom';

export interface CompletedFeedItem {
  id: string;
  kind: CompletedFeedItemKind;
  taskId: string;
  canOpen: boolean;
  title: string;
  description: string;
  listId: string;
  listName: string;
  listColor: string | null;
  completedAt: string;
  taskMode: TaskMode;
}

export interface CompletedFeedQuery {
  mode: CompletedFeedModeFilter;
  listId?: string | null;
  dateFilter: CompletedDateFilter;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
}

function byCompletedAtDescending(left: CompletedFeedItem, right: CompletedFeedItem): number {
  const leftTime = new Date(left.completedAt).getTime();
  const rightTime = new Date(right.completedAt).getTime();

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.id.localeCompare(left.id);
}

function matchesMode(item: CompletedFeedItem, mode: CompletedFeedModeFilter): boolean {
  if (mode === 'all') {
    return true;
  }

  if (mode === 'cycles') {
    return item.kind === 'cycle';
  }

  if (mode === 'todo') {
    return item.kind === 'task' && item.taskMode === 'todo';
  }

  return item.kind === 'task' && item.taskMode !== 'todo';
}

function matchesDateRange(item: CompletedFeedItem, query: CompletedFeedQuery, reference: Date): boolean {
  const completedAt = new Date(item.completedAt);

  if (query.dateFilter === 'all') {
    return true;
  }

  if (query.dateFilter === 'today') {
    const start = startOfDay(reference);
    const end = addDays(start, 1);
    return completedAt >= start && completedAt < end;
  }

  if (query.dateFilter === 'last7' || query.dateFilter === 'last30') {
    const daysToInclude = query.dateFilter === 'last7' ? 6 : 29;
    const start = startOfDay(addDays(reference, -daysToInclude));
    const end = addDays(startOfDay(reference), 1);
    return completedAt >= start && completedAt < end;
  }

  const rawStart = query.customStartDate ? startOfDay(query.customStartDate) : null;
  const rawEnd = query.customEndDate ? addDays(startOfDay(query.customEndDate), 1) : null;

  if (!rawStart && !rawEnd) {
    return true;
  }

  if (rawStart && rawEnd) {
    const start = rawStart <= rawEnd ? rawStart : addDays(rawEnd, -1);
    const end = rawStart <= rawEnd ? rawEnd : addDays(rawStart, 1);
    return completedAt >= start && completedAt < end;
  }

  if (rawStart) {
    return completedAt >= rawStart;
  }

  return completedAt < (rawEnd as Date);
}

export function buildCompletedFeedItems(tasks: Task[], history: TaskCompletionHistoryEntry[], lists: AppList[]): CompletedFeedItem[] {
  const listsById = new Map(lists.map((list) => [list.id, list]));
  const visibleCompletedTaskKeys = new Set(
    tasks
      .filter((task) => task.status === 'completed' && task.completedAt)
      .map((task) => `${task.id}::${task.completedAt}`)
  );
  const taskItems: CompletedFeedItem[] = tasks
    .filter((task) => task.status === 'completed' && task.completedAt)
    .map((task) => {
      const list = listsById.get(task.listId);
      return {
        id: `task:${task.id}`,
        kind: 'task',
        taskId: task.id,
        canOpen: true,
        title: task.title,
        description: task.description,
        listId: task.listId,
        listName: list?.name ?? '',
        listColor: list?.color ?? null,
        completedAt: task.completedAt as string,
        taskMode: task.taskMode
      };
    });

  const seenHistoryKeys = new Set<string>();
  const cycleItems: CompletedFeedItem[] = history.flatMap((entry) => {
    const completionKey = `${entry.taskId}::${entry.completedAt}`;
    if (visibleCompletedTaskKeys.has(completionKey) || seenHistoryKeys.has(completionKey)) {
      return [];
    }

    seenHistoryKeys.add(completionKey);
    const isCycle = entry.taskModeSnapshot === 'recurring';
    const list = listsById.get(entry.listId);
    return [
      {
        id: `${isCycle ? 'cycle' : 'history'}:${entry.id}`,
        kind: isCycle ? 'cycle' : 'task',
        taskId: entry.taskId,
        canOpen: false,
        title: entry.taskTitleSnapshot,
        description: entry.taskDescriptionSnapshot,
        listId: entry.listId,
        listName: entry.listNameSnapshot,
        listColor: list?.color ?? null,
        completedAt: entry.completedAt,
        taskMode: entry.taskModeSnapshot
      }
    ];
  });

  return [...taskItems, ...cycleItems].sort(byCompletedAtDescending);
}

export function filterCompletedFeedItems(items: CompletedFeedItem[], query: CompletedFeedQuery, reference = new Date()): CompletedFeedItem[] {
  return items.filter((item) => {
    if (!matchesMode(item, query.mode)) {
      return false;
    }

    if (query.listId && item.listId !== query.listId) {
      return false;
    }

    return matchesDateRange(item, query, reference);
  });
}
