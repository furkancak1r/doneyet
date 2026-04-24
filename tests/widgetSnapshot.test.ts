import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { defaultSettings } from '../constants/settings';
import { buildWidgetSnapshot } from '../utils/widgetSnapshot';
import type { AppList, AppSettings, Task } from '../types/domain';

const list: AppList = {
  id: 'list-1',
  name: 'Focus',
  color: '#116466',
  icon: 'briefcase',
  sortOrder: 0,
  createdAt: '2025-03-01T00:00:00.000Z'
};

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...defaultSettings,
    language: 'en',
    ...overrides
  };
}

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
    startDateTime: '2025-03-03T08:00:00.000Z',
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
    nextNotificationAt: '2025-03-03T08:00:00.000Z',
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: null,
    ...overrides
  };
}

describe('widget snapshot', () => {
  it('orders overdue reminders, today reminders, then active todos', () => {
    const reference = new Date('2025-03-03T09:00:00.000Z');
    const snapshot = buildWidgetSnapshot({
      lists: [list],
      settings: makeSettings(),
      reference,
      tasks: [
        makeTask({
          id: 'todo-task',
          title: 'Buy fruit',
          taskMode: 'todo',
          nextNotificationAt: null,
          updatedAt: '2025-03-03T08:59:00.000Z'
        }),
        makeTask({
          id: 'today-task',
          title: 'Team sync',
          nextNotificationAt: '2025-03-03T11:00:00.000Z'
        }),
        makeTask({
          id: 'overdue-task',
          title: 'Water plants',
          nextNotificationAt: '2025-03-03T08:00:00.000Z'
        })
      ]
    });

    expect(snapshot.tasks.map((task) => task.id)).toEqual(['overdue-task', 'today-task', 'todo-task']);
    expect(snapshot.tasks.find((task) => task.id === 'todo-task')?.dueAt).toBeNull();
    expect(snapshot.tasks.find((task) => task.id === 'today-task')?.actions).toEqual([
      { type: 'complete_finish', label: 'Complete and finish', url: '' }
    ]);
    expect(snapshot.tasks.find((task) => task.id === 'todo-task')?.actions).toEqual([{ type: 'complete', label: 'Done', url: '' }]);
    expect(snapshot.counts).toEqual({ overdue: 1, today: 1, todo: 1 });
  });

  it('uses cycle completion for due recurring reminders and no snooze action', () => {
    const reference = new Date('2025-03-03T09:00:00.000Z');
    const snapshot = buildWidgetSnapshot({
      lists: [list],
      settings: makeSettings(),
      reference,
      tasks: [
        makeTask({
          id: 'recurring-due',
          title: 'Stretch',
          taskMode: 'recurring',
          nextNotificationAt: '2025-03-03T08:00:00.000Z'
        })
      ]
    });

    expect(snapshot.tasks[0]?.actions).toEqual([{ type: 'complete_cycle', label: 'Complete this cycle', url: '' }]);
  });

  it('does not expose completion or snooze actions for a recurring reminder before its cycle is due', () => {
    const snapshot = buildWidgetSnapshot({
      lists: [list],
      settings: makeSettings(),
      reference: new Date('2025-03-03T09:00:00.000Z'),
      tasks: [
        makeTask({
          id: 'recurring-future',
          title: 'Stretch later',
          taskMode: 'recurring',
          nextNotificationAt: '2025-03-03T11:00:00.000Z'
        })
      ]
    });

    expect(snapshot.tasks[0]?.actions).toEqual([]);
  });

  it('excludes paused and completed tasks', () => {
    const snapshot = buildWidgetSnapshot({
      lists: [list],
      settings: makeSettings(),
      reference: new Date('2025-03-03T09:00:00.000Z'),
      tasks: [
        makeTask({ id: 'paused', status: 'paused' }),
        makeTask({ id: 'completed', status: 'completed', completedAt: '2025-03-03T08:30:00.000Z' })
      ]
    });

    expect(snapshot.tasks).toEqual([]);
    expect(snapshot.counts).toEqual({ overdue: 0, today: 0, todo: 0 });
  });

  it('uses Turkish widget copy when the app language is Turkish', async () => {
    await i18n.changeLanguage('tr');

    try {
      const snapshot = buildWidgetSnapshot({
        lists: [list],
        settings: makeSettings({ language: 'tr' }),
        reference: new Date('2025-03-03T09:00:00.000Z'),
        tasks: []
      });

      expect(snapshot.locale).toBe('tr');
      expect(snapshot.emptyTitle).toBe('Takip edilecek görev yok');
      expect(
        buildWidgetSnapshot({
          lists: [list],
          settings: makeSettings({ language: 'tr' }),
          reference: new Date('2025-03-03T09:00:00.000Z'),
          tasks: [makeTask({ id: 'single-tr' })]
        }).tasks[0]?.actions
      ).toEqual([{ type: 'complete_finish', label: 'Tamamla ve bitir', url: '' }]);
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('uses the configured widget language instead of the current i18n state', async () => {
    await i18n.changeLanguage('tr');

    try {
      const snapshot = buildWidgetSnapshot({
        lists: [list],
        settings: makeSettings({ language: 'en' }),
        reference: new Date('2025-03-03T09:00:00.000Z'),
        tasks: []
      });

      expect(snapshot.locale).toBe('en');
      expect(snapshot.emptyTitle).toBe('Nothing to track');
      expect(snapshot.subtitle).toBe('0 overdue • 0 today • 0 To-Do');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
