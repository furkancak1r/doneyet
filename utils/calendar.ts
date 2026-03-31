import { Task } from '@/types/domain';
import { addDays, startOfDay } from '@/utils/date';

export function toCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function startOfMonth(date: Date): Date {
  const value = startOfDay(date);
  value.setDate(1);
  return value;
}

export function shiftMonth(date: Date, amount: number): Date {
  const value = startOfMonth(date);
  value.setMonth(value.getMonth() + amount);
  return value;
}

export function buildCalendarMonthDays(month: Date): Date[] {
  const monthStart = startOfMonth(month);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const nextMonthStart = shiftMonth(monthStart, 1);
  const monthEnd = addDays(nextMonthStart, -1);
  const gridEnd = addDays(monthEnd, 6 - monthEnd.getDay());

  const days: Date[] = [];
  for (let cursor = gridStart; cursor.getTime() <= gridEnd.getTime(); cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }

  return days;
}

export function getTaskCalendarDate(task: Task): Date | null {
  if (task.status === 'paused' && task.taskMode !== 'todo') {
    return null;
  }

  const anchor = task.taskMode === 'todo' ? task.startDateTime : task.nextNotificationAt ?? task.startDateTime;
  if (!anchor) {
    return null;
  }

  const date = new Date(anchor);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sortCalendarTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const leftDate = getTaskCalendarDate(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDate = getTaskCalendarDate(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    if (left.status !== right.status) {
      if (left.status === 'completed') {
        return 1;
      }

      if (right.status === 'completed') {
        return -1;
      }
    }

    return left.title.localeCompare(right.title);
  });
}

export function groupTasksByCalendarDay(tasks: Task[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = {};

  for (const task of tasks) {
    const date = getTaskCalendarDate(task);
    if (!date) {
      continue;
    }

    const key = toCalendarDateKey(date);
    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(task);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key] = sortCalendarTasks(grouped[key]);
  }

  return grouped;
}
