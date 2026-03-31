import { describe, expect, it } from 'vitest';
import { Task } from '../types/domain';
import { filterTasks } from '../utils/taskFilters';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-base',
    title: 'Task',
    description: '',
    listId: 'list-1',
    sortOrder: 0,
    createdAt: '2025-03-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
    startReminderType: 'today_at_time',
    startDateTime: new Date(2025, 2, 3, 8, 0, 0, 0).toISOString(),
    startReminderWeekday: null,
    startReminderDayOfMonth: null,
    startReminderTime: '08:00',
    startReminderUsesLastDay: 0,
    taskMode: 'single',
    repeatIntervalType: 'preset',
    repeatIntervalValue: 1,
    repeatIntervalUnit: 'hours',
    status: 'active',
    lastNotificationAt: null,
    nextNotificationAt: new Date(2025, 2, 3, 8, 0, 0, 0).toISOString(),
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: null,
    ...overrides
  };
}

describe('task filters', () => {
  it('excludes paused reminders from today and week views', () => {
    const reference = new Date(2025, 2, 3, 9, 0, 0, 0);
    const pausedTask = makeTask({
      id: 'paused-task',
      status: 'paused',
      nextNotificationAt: new Date(2025, 2, 3, 11, 0, 0, 0).toISOString()
    });

    expect(filterTasks([pausedTask], { filter: 'today', sort: 'nextNotification' }, reference)).toEqual([]);
    expect(filterTasks([pausedTask], { filter: 'week', sort: 'nextNotification' }, reference)).toEqual([]);
  });

  it('excludes paused reminders from overdue views', () => {
    const reference = new Date(2025, 2, 3, 12, 0, 0, 0);
    const pausedTask = makeTask({
      id: 'paused-task',
      status: 'paused',
      nextNotificationAt: new Date(2025, 2, 3, 8, 0, 0, 0).toISOString()
    });

    expect(filterTasks([pausedTask], { filter: 'overdue', sort: 'nextNotification' }, reference)).toEqual([]);
  });
});
