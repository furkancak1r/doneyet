import { describe, expect, it } from 'vitest';
import { buildCompletedFeedItems, filterCompletedFeedItems } from '../utils/completedFeed';
import { AppList, Task, TaskCompletionHistoryEntry } from '../types/domain';

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
    startDateTime: '2025-03-01T08:00:00.000Z',
    startReminderWeekday: null,
    startReminderDayOfMonth: null,
    startReminderTime: '08:00',
    startReminderUsesLastDay: 0,
    taskMode: 'single',
    repeatIntervalType: 'preset',
    repeatIntervalValue: 1,
    repeatIntervalUnit: 'hours',
    status: 'completed',
    lastNotificationAt: null,
    nextNotificationAt: null,
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: '2025-03-10T09:00:00.000Z',
    ...overrides
  };
}

const lists: AppList[] = [
  { id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', sortOrder: 0, createdAt: '2025-03-01T00:00:00.000Z' },
  { id: 'list-2', name: 'Home', color: '#2F7A56', icon: 'home-outline', sortOrder: 1, createdAt: '2025-03-01T00:00:00.000Z' }
];

const cycleHistory: TaskCompletionHistoryEntry[] = [
  {
    id: 'completion-1',
    taskId: 'task-cycle',
    taskTitleSnapshot: 'Weekly review',
    taskDescriptionSnapshot: 'Close the week',
    taskModeSnapshot: 'recurring',
    listId: 'list-2',
    listNameSnapshot: 'Home',
    completedAt: '2025-03-12T10:00:00.000Z'
  }
];

describe('completed feed utilities', () => {
  it('builds a combined feed sorted by completed date descending', () => {
    const items = buildCompletedFeedItems(
      [
        makeTask({ id: 'task-reminder', title: 'Pay rent', completedAt: '2025-03-11T09:00:00.000Z' }),
        makeTask({ id: 'task-todo', title: 'Buy fruit', taskMode: 'todo', completedAt: '2025-03-10T09:00:00.000Z' })
      ],
      cycleHistory,
      lists
    );

    expect(items.map((item) => item.id)).toEqual(['cycle:completion-1', 'task:task-reminder', 'task:task-todo']);
    expect(items[0]).toMatchObject({ kind: 'cycle', listName: 'Home', taskMode: 'recurring' });
  });

  it('filters by mode and list', () => {
    const items = buildCompletedFeedItems(
      [
        makeTask({ id: 'task-reminder', listId: 'list-1' }),
        makeTask({ id: 'task-recurring', taskMode: 'recurring', listId: 'list-1' }),
        makeTask({ id: 'task-todo', taskMode: 'todo', listId: 'list-2' })
      ],
      cycleHistory,
      lists
    );

    expect(filterCompletedFeedItems(items, { mode: 'reminder', dateFilter: 'all' })).toHaveLength(2);
    expect(filterCompletedFeedItems(items, { mode: 'todo', dateFilter: 'all' })).toHaveLength(1);
    expect(filterCompletedFeedItems(items, { mode: 'cycles', dateFilter: 'all' })).toHaveLength(1);
    expect(filterCompletedFeedItems(items, { mode: 'all', listId: 'list-2', dateFilter: 'all' }).map((item) => item.id)).toEqual([
      'cycle:completion-1',
      'task:task-todo'
    ]);
  });

  it('filters by preset and custom completion date ranges', () => {
    const items = buildCompletedFeedItems(
      [
        makeTask({ id: 'recent-task', completedAt: '2025-03-12T09:00:00.000Z' }),
        makeTask({ id: 'older-task', completedAt: '2025-02-01T09:00:00.000Z' })
      ],
      cycleHistory,
      lists
    );
    const reference = new Date('2025-03-12T12:00:00.000Z');

    expect(filterCompletedFeedItems(items, { mode: 'all', dateFilter: 'today' }, reference).map((item) => item.id)).toEqual([
      'cycle:completion-1',
      'task:recent-task'
    ]);

    expect(
      filterCompletedFeedItems(
        items,
        {
          mode: 'all',
          dateFilter: 'custom',
          customStartDate: new Date('2025-03-10T00:00:00.000Z'),
          customEndDate: new Date('2025-03-12T00:00:00.000Z')
        },
        reference
      ).map((item) => item.id)
    ).toEqual(['cycle:completion-1', 'task:recent-task']);
  });

  it('keeps cycle history visible from stored snapshots after the source task or list is removed', () => {
    const items = buildCompletedFeedItems(
      [],
      [
        {
          id: 'completion-orphan',
          taskId: 'deleted-task',
          taskTitleSnapshot: 'Archived review',
          taskDescriptionSnapshot: 'Still visible',
          taskModeSnapshot: 'recurring',
          listId: 'deleted-list',
          listNameSnapshot: 'Archived list',
          completedAt: '2025-03-13T09:00:00.000Z'
        }
      ],
      lists
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'cycle:completion-orphan',
      kind: 'cycle',
      title: 'Archived review',
      listName: 'Archived list',
      listColor: null
    });
  });

  it('does not duplicate the final recurring completion when the task is permanently finished', () => {
    const completedAt = '2025-03-13T09:00:00.000Z';
    const items = buildCompletedFeedItems(
      [
        makeTask({
          id: 'task-cycle',
          title: 'Weekly review',
          taskMode: 'recurring',
          completedAt
        })
      ],
      [
        {
          id: 'completion-final',
          taskId: 'task-cycle',
          taskTitleSnapshot: 'Weekly review',
          taskDescriptionSnapshot: 'Close the week',
          taskModeSnapshot: 'recurring',
          listId: 'list-1',
          listNameSnapshot: 'Focus',
          completedAt
        }
      ],
      lists
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'task:task-cycle',
      kind: 'task'
    });
  });

  it('keeps deleted completed one-time tasks visible as read-only history items', () => {
    const items = buildCompletedFeedItems(
      [],
      [
        {
          id: 'completion-single',
          taskId: 'deleted-single',
          taskTitleSnapshot: 'Filed taxes',
          taskDescriptionSnapshot: '',
          taskModeSnapshot: 'single',
          listId: 'list-1',
          listNameSnapshot: 'Focus',
          completedAt: '2025-03-14T09:00:00.000Z'
        }
      ],
      lists
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'history:completion-single',
      kind: 'task',
      taskMode: 'single',
      canOpen: false,
      title: 'Filed taxes'
    });
    expect(filterCompletedFeedItems(items, { mode: 'reminder', dateFilter: 'all' })).toHaveLength(1);
  });
});
