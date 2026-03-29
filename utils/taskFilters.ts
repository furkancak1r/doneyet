import { AppList, Task } from '@/types/domain';
import { getVisibleTaskState, startOfDay, addDays } from '@/utils/date';
import { safeParseJson } from '@/utils/json';

export type TaskFilter = 'all' | 'active' | 'completed' | 'today' | 'week' | 'overdue';
export type TaskSort = 'startDate' | 'nextNotification' | 'createdAt' | 'manual';

export interface TaskQuery {
  filter: TaskFilter;
  sort: TaskSort;
  listId?: string | null;
  tag?: string | null;
}

function matchesList(task: Task, listId?: string | null): boolean {
  return !listId || task.listId === listId;
}

function matchesTag(task: Task, tag?: string | null): boolean {
  if (!tag) {
    return true;
  }

  const tags = safeParseJson<string[]>(task.tagsJson || '[]', []);
  return tags.some((value) => value.toLowerCase() === tag.toLowerCase());
}

export function filterTasks(tasks: Task[], query: TaskQuery, reference = new Date()): Task[] {
  const weekEnd = addDays(startOfDay(reference), 7);

  return tasks.filter((task) => {
    if (!matchesList(task, query.listId)) {
      return false;
    }

    if (!matchesTag(task, query.tag)) {
      return false;
    }

    const state = getVisibleTaskState(task, reference);

    switch (query.filter) {
      case 'active':
        return task.status === 'active';
      case 'completed':
        return task.status === 'completed';
      case 'today': {
        const nextAt = task.nextNotificationAt ? new Date(task.nextNotificationAt) : null;
        if (!nextAt) {
          return false;
        }
        return nextAt >= startOfDay(reference) && nextAt < addDays(startOfDay(reference), 1);
      }
      case 'week': {
        const nextAt = task.nextNotificationAt ? new Date(task.nextNotificationAt) : null;
        if (!nextAt) {
          return false;
        }
        return nextAt >= startOfDay(reference) && nextAt < weekEnd;
      }
      case 'overdue':
        return state === 'overdue';
      case 'all':
      default:
        return true;
    }
  });
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const clone = [...tasks];

  const byDate = (left: string | null, right: string | null): number => {
    const leftTime = left ? new Date(left).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right ? new Date(right).getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  };

  clone.sort((left, right) => {
    if (sort === 'manual') {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return byDate(right.createdAt, left.createdAt);
    }

    if (sort === 'nextNotification') {
      return byDate(left.nextNotificationAt, right.nextNotificationAt);
    }

    if (sort === 'startDate') {
      return byDate(left.startDateTime, right.startDateTime);
    }

    return byDate(left.createdAt, right.createdAt);
  });

  return clone;
}

export function countTasksForList(tasks: Task[], listId: string): number {
  return tasks.filter((task) => task.listId === listId && task.status !== 'completed').length;
}

export function countTasksByState(tasks: Task[], state: 'today' | 'overdue' | 'completed' | 'active', reference = new Date()): number {
  if (state === 'completed') {
    return tasks.filter((task) => task.status === 'completed').length;
  }

  if (state === 'active') {
    return tasks.filter((task) => task.status === 'active').length;
  }

  if (state === 'today') {
    return filterTasks(tasks, { filter: 'today', sort: 'nextNotification' }, reference).length;
  }

  return filterTasks(tasks, { filter: 'overdue', sort: 'nextNotification' }, reference).length;
}

export function getListTaskCounts(tasks: Task[], lists: AppList[]): Record<string, number> {
  return lists.reduce<Record<string, number>>((acc, list) => {
    acc[list.id] = countTasksForList(tasks, list.id);
    return acc;
  }, {});
}
