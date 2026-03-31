import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { daysInMonth, formatDateTR, formatDurationLabel, getNextStartDateTime, getNextTaskOccurrence, getVisibleTaskState, isLeapYear } from '../utils/date';
import { Task } from '../types/domain';

function expectLocalDateTime(
  date: Date,
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number
): void {
  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(monthIndex);
  expect(date.getDate()).toBe(day);
  expect(date.getHours()).toBe(hour);
  expect(date.getMinutes()).toBe(minute);
}

describe('date helpers', () => {
  function buildTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
    const { id, ...rest } = overrides;
    return {
      id,
      title: 'Task',
      description: '',
      listId: 'list-1',
      sortOrder: 0,
      createdAt: '2025-03-01T00:00:00.000Z',
      updatedAt: '2025-03-01T00:00:00.000Z',
      startReminderType: 'today_at_time',
      startDateTime: '2025-03-01T20:20:00.000Z',
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '20:20',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 30,
      repeatIntervalUnit: 'minutes',
      status: 'active',
      lastNotificationAt: null,
      nextNotificationAt: '2025-03-01T20:20:00.000Z',
      snoozedUntil: null,
      notificationIdsJson: '[]',
      completedAt: null,
      ...rest
    };
  }

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('detects leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
  });

  it('calculates the last day of a normal February', () => {
    const result = getNextStartDateTime(
      'monthly_on_last_day',
      new Date('2025-02-10T00:00:00.000Z'),
      null,
      null,
      '09:30',
      true,
      new Date('2025-02-10T00:00:00.000Z')
    );

    expect(result.getDate()).toBe(28);
  });

  it('calculates the last day of a leap-year February', () => {
    const result = getNextStartDateTime(
      'monthly_on_last_day',
      new Date('2024-02-10T00:00:00.000Z'),
      null,
      null,
      '09:30',
      true,
      new Date('2024-02-10T00:00:00.000Z')
    );

    expect(result.getDate()).toBe(29);
  });

  it('clamps monthly day 31 to the last valid day', () => {
    const result = getNextStartDateTime(
      'monthly_on_day',
      new Date('2025-04-01T00:00:00.000Z'),
      null,
      31,
      '08:00',
      false,
      new Date('2025-04-01T00:00:00.000Z')
    );

    expect(result.getDate()).toBe(30);
  });

  it('moves past today-at-time reminders to the next day at the same clock time', () => {
    const reference = new Date(2025, 2, 1, 10, 0, 0, 0);

    const result = getNextStartDateTime(
      'today_at_time',
      new Date(2025, 2, 1, 9, 30, 0, 0),
      null,
      null,
      '09:30',
      false,
      reference
    );

    expectLocalDateTime(result, 2025, 2, 2, 9, 30);
  });

  it('keeps future today-at-time reminders on the same day', () => {
    const reference = new Date(2025, 2, 1, 10, 0, 0, 0);

    const result = getNextStartDateTime(
      'today_at_time',
      new Date(2025, 2, 1, 11, 15, 0, 0),
      null,
      null,
      '11:15',
      false,
      reference
    );

    expectLocalDateTime(result, 2025, 2, 1, 11, 15);
  });

  it('preserves the existing exact-date fallback for past reminders', () => {
    const reference = new Date(2025, 2, 1, 10, 0, 0, 0);

    const result = getNextStartDateTime(
      'exact_date_time',
      new Date(2025, 2, 1, 9, 0, 0, 0),
      null,
      null,
      '09:00',
      false,
      reference
    );

    expectLocalDateTime(result, 2025, 2, 1, 10, 1);
  });

  it('advances past nextNotificationAt by repeat interval before falling back to start rules', () => {
    const reference = new Date(2025, 2, 1, 20, 35, 0, 0);

    const result = getNextTaskOccurrence(
      buildTask({
        id: 'task-1',
        nextNotificationAt: new Date(2025, 2, 1, 20, 20, 0, 0).toISOString()
      }),
      reference
    );

    expectLocalDateTime(result, 2025, 2, 1, 20, 50);
  });

  it('keeps a future snoozedUntil as the next occurrence', () => {
    const reference = new Date(2025, 2, 1, 20, 35, 0, 0);

    const result = getNextTaskOccurrence(
      buildTask({
        id: 'task-2',
        snoozedUntil: new Date(2025, 2, 1, 21, 5, 0, 0).toISOString()
      }),
      reference
    );

    expectLocalDateTime(result, 2025, 2, 1, 21, 5);
  });

  it('reports paused tasks as paused before any time-based state', () => {
    const reference = new Date(2025, 2, 1, 20, 35, 0, 0);

    const result = getVisibleTaskState(
      buildTask({
        id: 'task-3',
        status: 'paused',
        nextNotificationAt: new Date(2025, 2, 1, 20, 20, 0, 0).toISOString()
      }),
      reference
    );

    expect(result).toBe('paused');
  });

  it('reports month length correctly', () => {
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 3)).toBe(30);
    expect(daysInMonth(2025, 6)).toBe(31);
  });

  it('formats dates and duration labels in the active language', async () => {
    await i18n.changeLanguage('tr');

    expect(formatDateTR(new Date(2025, 0, 15))).toContain('Oca');
    expect(formatDurationLabel(12, 'minutes')).toBe('12 dk');
    expect(formatDurationLabel(2, 'hours')).toBe('2 saat');

    await i18n.changeLanguage('en');

    expect(formatDateTR(new Date(2025, 0, 15))).toContain('Jan');
    expect(formatDurationLabel(12, 'minutes')).toBe('12 min');
    expect(formatDurationLabel(2, 'hours')).toBe('2 hours');
  });
});
