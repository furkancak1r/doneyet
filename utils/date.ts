import { RepeatIntervalUnit, StartReminderType, Task } from '@/types/domain';
import i18n from '@/i18n';
import { getCurrentAppLanguage, getCurrentLocale } from '@/utils/locale';

export type VisibleTaskState = 'active' | 'paused' | 'snoozed' | 'overdue' | 'upcoming' | 'completed';

export function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function addMinutes(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 60_000);
}

export function addHours(date: Date, amount: number): Date {
  return addMinutes(date, amount * 60);
}

export function addDays(date: Date, amount: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

export function parseClockTime(clockTime: string): { hour: number; minute: number } {
  const [hourText, minuteText] = clockTime.split(':');
  return {
    hour: Number(hourText ?? 0),
    minute: Number(minuteText ?? 0)
  };
}

export function setTimeOnDate(base: Date, clockTime: string): Date {
  const value = new Date(base);
  const { hour, minute } = parseClockTime(clockTime);
  value.setHours(hour, minute, 0, 0);
  return value;
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTimeTR(date: Date | string | null, locale = getCurrentLocale()): string {
  if (!date) {
    return '-';
  }

  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

export function formatDateTR(date: Date | string | null, locale = getCurrentLocale()): string {
  if (!date) {
    return '-';
  }

  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium'
  }).format(value);
}

export function formatTimeDisplay(date: Date, locale = getCurrentLocale()): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function weekdayName(index: number): string {
  return String(i18n.t(`weekdays.${index}`, { defaultValue: 'Sunday' }));
}

export function getWeekdayLabels(): string[] {
  return Array.from({ length: 7 }, (_, index) => weekdayName(index));
}

export function formatDurationLabel(value: number, unit: RepeatIntervalUnit): string {
  if (unit === 'minutes') {
    return getCurrentAppLanguage() === 'tr' ? `${value} dk` : `${value} min`;
  }

  return getCurrentAppLanguage() === 'tr' ? `${value} saat` : `${value} hour${value === 1 ? '' : 's'}`;
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function addRepeatInterval(date: Date, value: number, unit: RepeatIntervalUnit): Date {
  return unit === 'minutes' ? addMinutes(date, value) : addHours(date, value);
}

export function getNextTaskOccurrence(task: Task, reference = new Date()): Date {
  if (task.snoozedUntil) {
    const snoozed = new Date(task.snoozedUntil);
    if (snoozed.getTime() > reference.getTime()) {
      return snoozed;
    }
  }

  if (task.nextNotificationAt) {
    let candidate = new Date(task.nextNotificationAt);
    while (candidate.getTime() <= reference.getTime()) {
      candidate = addRepeatInterval(candidate, task.repeatIntervalValue, task.repeatIntervalUnit);
    }
    return candidate;
  }

  return getNextStartDateTime(
    task.startReminderType,
    new Date(task.startDateTime),
    task.startReminderWeekday,
    task.startReminderDayOfMonth,
    task.startReminderTime,
    Boolean(task.startReminderUsesLastDay),
    reference
  );
}

export function hasTimePassed(reference: Date, target: Date): boolean {
  return target.getTime() <= reference.getTime();
}

export function getMonthlyCandidate(base: Date, dayOfMonth: number | null, useLastDay: boolean, clockTime: string): Date {
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthDays = daysInMonth(year, month);
  const candidateDay = useLastDay ? monthDays : Math.min(dayOfMonth ?? monthDays, monthDays);
  const candidate = new Date(year, month, candidateDay);
  return setTimeOnDate(candidate, clockTime);
}

export function getNextStartDateTime(
  startReminderType: StartReminderType,
  startDateTime: Date,
  startReminderWeekday: number | null,
  startReminderDayOfMonth: number | null,
  startReminderTime: string,
  startReminderUsesLastDay: boolean,
  reference = new Date()
): Date {
  const safeReference = new Date(reference);

  if (startReminderType === 'exact_date_time') {
    return startDateTime.getTime() > safeReference.getTime() ? startDateTime : addMinutes(safeReference, 1);
  }

  if (startReminderType === 'today_at_time') {
    const candidate = setTimeOnDate(safeReference, startReminderTime);
    return candidate.getTime() > safeReference.getTime() ? candidate : setTimeOnDate(addDays(safeReference, 1), startReminderTime);
  }

  if (startReminderType === 'tomorrow_at_time') {
    const candidate = setTimeOnDate(addDays(safeReference, 1), startReminderTime);
    return candidate;
  }

  if (startReminderType === 'weekly_on_weekday') {
    const weekday = startReminderWeekday ?? 1;
    const candidate = new Date(safeReference);
    const currentWeekday = candidate.getDay();
    const delta = (weekday - currentWeekday + 7) % 7;
    candidate.setDate(candidate.getDate() + delta);
    const withTime = setTimeOnDate(candidate, startReminderTime);
    if (withTime.getTime() <= safeReference.getTime()) {
      return addDays(withTime, 7);
    }
    return withTime;
  }

  if (startReminderType === 'monthly_on_day' || startReminderType === 'monthly_on_last_day') {
    const candidate = getMonthlyCandidate(safeReference, startReminderDayOfMonth, startReminderUsesLastDay, startReminderTime);
    if (candidate.getTime() > safeReference.getTime()) {
      return candidate;
    }

    const nextMonth = new Date(safeReference.getFullYear(), safeReference.getMonth() + 1, 1);
    return getMonthlyCandidate(nextMonth, startReminderDayOfMonth, startReminderUsesLastDay, startReminderTime);
  }

  return startDateTime;
}

export function getVisibleTaskState(task: Task, reference = new Date()): VisibleTaskState {
  if (task.status === 'completed') {
    return 'completed';
  }

  if (task.status === 'paused') {
    return 'paused';
  }

  const snoozedUntil = task.snoozedUntil ? new Date(task.snoozedUntil) : null;
  if (snoozedUntil && snoozedUntil.getTime() > reference.getTime()) {
    return 'snoozed';
  }

  const nextNotificationAt = task.nextNotificationAt ? new Date(task.nextNotificationAt) : null;
  if (nextNotificationAt && nextNotificationAt.getTime() <= reference.getTime()) {
    return 'overdue';
  }

  return task.startDateTime ? 'upcoming' : 'active';
}

export function getRepeatIntervalMs(value: number, unit: RepeatIntervalUnit): number {
  return unit === 'minutes' ? value * 60_000 : value * 3_600_000;
}

export function getDueDateForTask(task: Task): Date {
  return task.nextNotificationAt ? new Date(task.nextNotificationAt) : new Date(task.startDateTime);
}

export function getNextOccurrences(anchor: Date, task: Task, limit: number, horizonDays = 30): Date[] {
  const results: Date[] = [];
  const intervalMs = getRepeatIntervalMs(task.repeatIntervalValue, task.repeatIntervalUnit);
  const horizon = addDays(anchor, horizonDays).getTime();

  let current = new Date(anchor);
  while (results.length < limit && current.getTime() <= horizon) {
    results.push(new Date(current));
    current = new Date(current.getTime() + intervalMs);
  }

  return results;
}

export function toClockParts(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(':').map(Number);
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
}
