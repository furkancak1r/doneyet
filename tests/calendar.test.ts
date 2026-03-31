import { describe, expect, it } from 'vitest';
import type { Task } from '../types/domain';
import { buildCalendarMonthDays, groupTasksByCalendarDay, shiftMonth, startOfMonth, toCalendarDateKey } from '../utils/calendar';

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

describe('calendar helpers', () => {
  it('shifts a visible month from the first day of the current month', () => {
    const nextMonth = shiftMonth(startOfMonth(new Date(2025, 0, 31, 15, 45, 0, 0)), 1);

    expect(nextMonth.getFullYear()).toBe(2025);
    expect(nextMonth.getMonth()).toBe(1);
    expect(nextMonth.getDate()).toBe(1);
  });

  it('builds a calendar grid that includes leading and trailing days', () => {
    const days = buildCalendarMonthDays(new Date(2025, 3, 10, 12, 0, 0, 0));

    expect(days).toHaveLength(35);
    expect(toCalendarDateKey(days[0])).toBe('2025-03-30');
    expect(toCalendarDateKey(days[days.length - 1])).toBe('2025-05-03');
  });

  it('groups reminder and to-do tasks by the day they appear on the calendar', () => {
    const grouped = groupTasksByCalendarDay([
      makeTask({
        id: 'todo-1',
        title: 'Todo first',
        taskMode: 'todo',
        nextNotificationAt: null,
        startDateTime: new Date(2025, 2, 3, 8, 0, 0, 0).toISOString()
      }),
      makeTask({
        id: 'reminder-1',
        title: 'Reminder second',
        taskMode: 'single',
        nextNotificationAt: new Date(2025, 2, 3, 9, 30, 0, 0).toISOString(),
        startDateTime: new Date(2025, 2, 3, 9, 30, 0, 0).toISOString()
      }),
      makeTask({
        id: 'done-1',
        title: 'Completed task',
        status: 'completed',
        nextNotificationAt: null,
        startDateTime: new Date(2025, 2, 4, 10, 0, 0, 0).toISOString()
      })
    ]);

    expect(Object.keys(grouped).sort()).toEqual(['2025-03-03', '2025-03-04']);
    expect(grouped['2025-03-03']).toHaveLength(2);
    expect(grouped['2025-03-03'][0].id).toBe('todo-1');
    expect(grouped['2025-03-04']).toHaveLength(1);
    expect(grouped['2025-03-04'][0].id).toBe('done-1');
  });

  it('does not group paused reminders by their hidden next notification anchor', () => {
    const grouped = groupTasksByCalendarDay([
      makeTask({
        id: 'paused-reminder',
        status: 'paused',
        taskMode: 'single',
        nextNotificationAt: new Date(2025, 2, 5, 9, 30, 0, 0).toISOString(),
        startDateTime: new Date(2025, 2, 5, 9, 30, 0, 0).toISOString()
      })
    ]);

    expect(grouped).toEqual({});
  });
});
