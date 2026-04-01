import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import HomeScreen from '@/app/(tabs)/index';
import { useApp } from '@/hooks/useApp';
import { Task } from '@/types/domain';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  router: {
    push: jest.fn()
  }
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('@react-navigation/native', () => ({
  useScrollToTop: jest.fn()
}));

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    NestableScrollContainer: React.forwardRef(({ children }: { children: React.ReactNode }, _ref: React.ForwardedRef<unknown>) => <View>{children}</View>),
    NestableDraggableFlatList: ({
      data,
      renderItem
    }: {
      data: Array<{ id: string }>;
      renderItem: (args: { item: { id: string }; drag: () => void; isActive: boolean }) => React.ReactNode;
    }) => (
      <View>
        {data.map((item) => (
          <View key={item.id}>{renderItem({ item, drag: () => {}, isActive: false })}</View>
        ))}
      </View>
    )
  };
});

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/components/Screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/components/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  }
}));

jest.mock('@/components/ListCard', () => ({
  ListCard: ({ list }: { list: { name: string } }) => {
    const { Text } = require('react-native');
    return <Text>{list.name}</Text>;
  }
}));

jest.mock('@/components/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
      </View>
    );
  }
}));

jest.mock('@/components/TaskCard', () => ({
  TaskCard: ({ task }: { task: { title: string } }) => {
    const { Text } = require('react-native');
    return <Text>{task.title}</Text>;
  }
}));

jest.mock('@/features/tasks/QuickAddTaskCard', () => ({
  QuickAddTaskCard: () => {
    const { Text } = require('react-native');
    return <Text>Quick Add</Text>;
  }
}));

jest.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: () => {}
  },
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'home.heroTitle': 'Done yet?',
          'home.heroSubtitle': 'Keeps tasks active.',
          'home.statsActive': 'Aktif',
          'home.statsToday': 'Bugun',
          'home.statsOverdue': 'Geciken',
          'home.sectionActiveTitle': 'Aktif gorevler',
          'home.sectionActiveHint': 'Acik gorevler.',
          'home.activeFilterReminder': 'Hatirlatmalar',
          'home.activeFilterTodo': 'To-Do',
          'home.loadMoreActive': 'Daha fazla yukle',
          'home.emptyActiveReminderTitle': 'Aktif hatirlatma yok',
          'home.emptyActiveReminderDescription': 'Su anda acik durumda bildirimli bir gorev gorunmuyor.',
          'home.emptyActiveTodoTitle': 'Aktif To-Do yok',
          'home.emptyActiveTodoDescription': 'Su anda acik durumda To-Do gorev gorunmuyor.',
          'home.sectionListsTitle': 'Listeler',
          'home.addList': 'Liste ekle',
          'quickAdd.helper': 'Liste yardimi',
          'empty.lists.title': 'Liste yok',
          'empty.lists.description': 'Ilk listen otomatik olusturuldu.',
          'home.sectionTodayTitle': 'Bugun hatirlatilacaklar',
          'home.sectionTodayAction': 'Tumu',
          'home.emptyTodayTitle': 'Bugun gorev yok',
          'home.emptyTodayDescription': 'Bugun icin planlanan gorev gorunmuyor.',
          'home.sectionOverdueTitle': 'Gecikenler',
          'home.sectionOverdueAction': 'Takip et',
          'home.emptyOverdueTitle': 'Geciken gorev yok',
          'home.emptyOverdueDescription': 'Bekleyen gorevler zamaninda gorunuyor.'
        } as Record<string, string>
      )[key] ?? key
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

const theme = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F5',
  text: '#101010',
  mutedText: '#606060',
  border: '#DDDDDD',
  primary: '#2A6EF0',
  primarySoft: '#E8F0FF',
  danger: '#C62828',
  warning: '#F57C00',
  success: '#2F7A56',
  chip: '#999999',
  shadow: '#000000'
};

function buildTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'task-1',
    title: overrides.title ?? 'Task',
    description: overrides.description ?? '',
    listId: overrides.listId ?? 'list-1',
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? '2026-04-01T08:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-04-01T08:00:00.000Z',
    startReminderType: overrides.startReminderType ?? 'today_at_time',
    startDateTime: overrides.startDateTime ?? '2030-01-01T09:00:00.000Z',
    startReminderWeekday: overrides.startReminderWeekday ?? null,
    startReminderDayOfMonth: overrides.startReminderDayOfMonth ?? null,
    startReminderTime: overrides.startReminderTime ?? '09:00',
    startReminderUsesLastDay: overrides.startReminderUsesLastDay ?? 0,
    taskMode: overrides.taskMode ?? 'single',
    repeatIntervalType: overrides.repeatIntervalType ?? 'preset',
    repeatIntervalValue: overrides.repeatIntervalValue ?? 1,
    repeatIntervalUnit: overrides.repeatIntervalUnit ?? 'hours',
    status: overrides.status ?? 'active',
    lastNotificationAt: overrides.lastNotificationAt ?? null,
    nextNotificationAt: overrides.nextNotificationAt ?? '2030-01-01T09:00:00.000Z',
    snoozedUntil: overrides.snoozedUntil ?? null,
    notificationIdsJson: overrides.notificationIdsJson ?? '[]',
    completedAt: overrides.completedAt ?? null
  };
}

function renderScreen(tasks: Task[]) {
  mockedUseApp.mockReturnValue({
    tasks,
    lists: [{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', createdAt: '', sortOrder: 0 }],
    theme,
    completeTask: jest.fn(),
    snoozeTask: jest.fn(),
    notificationGranted: true,
    debugScreenshotMode: false,
    requestNotificationPermission: jest.fn(),
    reorderLists: jest.fn()
  } as any);

  return render(<HomeScreen />);
}

function buildReminderTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) =>
    buildTask({
      id: `reminder-${index + 1}`,
      title: `Reminder ${index + 1}`,
      sortOrder: index,
      taskMode: index % 2 === 0 ? 'single' : 'recurring',
      nextNotificationAt: `2030-01-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`
    })
  );
}

function buildTodoTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) =>
    buildTask({
      id: `todo-${index + 1}`,
      title: `Todo ${index + 1}`,
      sortOrder: 100 + index,
      taskMode: 'todo',
      nextNotificationAt: null
    })
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows reminder tasks by default and loads five at a time', () => {
    renderScreen([...buildReminderTasks(6), ...buildTodoTasks(2)]);

    expect(screen.getByText('Reminder 1')).toBeTruthy();
    expect(screen.getByText('Reminder 5')).toBeTruthy();
    expect(screen.queryByText('Reminder 6')).toBeNull();
    expect(screen.queryByText('Todo 1')).toBeNull();
    expect(screen.getByTestId('home-active-load-more')).toBeTruthy();

    fireEvent.press(screen.getByTestId('home-active-load-more'));

    expect(screen.getByText('Reminder 6')).toBeTruthy();
    expect(screen.queryByTestId('home-active-load-more')).toBeNull();
  });

  it('switches to To-Do tasks and resets the visible reminder count when switching back', () => {
    renderScreen([...buildReminderTasks(7), ...buildTodoTasks(2)]);

    fireEvent.press(screen.getByTestId('home-active-load-more'));
    expect(screen.getByText('Reminder 7')).toBeTruthy();

    fireEvent.press(screen.getByTestId('home-active-filter-todo'));

    expect(screen.getByText('Todo 1')).toBeTruthy();
    expect(screen.getByText('Todo 2')).toBeTruthy();
    expect(screen.queryByText('Reminder 1')).toBeNull();
    expect(screen.queryByTestId('home-active-load-more')).toBeNull();

    fireEvent.press(screen.getByTestId('home-active-filter-reminder'));

    expect(screen.getByText('Reminder 1')).toBeTruthy();
    expect(screen.getByText('Reminder 5')).toBeTruthy();
    expect(screen.queryByText('Reminder 6')).toBeNull();
    expect(screen.queryByText('Reminder 7')).toBeNull();
    expect(screen.getByTestId('home-active-load-more')).toBeTruthy();
  });

  it('defaults to To-Do tasks when there are no active reminders', () => {
    renderScreen(buildTodoTasks(2));

    expect(screen.getByText('Todo 1')).toBeTruthy();
    expect(screen.getByText('Todo 2')).toBeTruthy();
    expect(screen.queryByText('Aktif hatirlatma yok')).toBeNull();
    expect(screen.queryByText('Su anda acik durumda bildirimli bir gorev gorunmuyor.')).toBeNull();
  });

  it('does not lock the reminder filter when the already-selected reminder filter is tapped', () => {
    const view = renderScreen([...buildReminderTasks(1), ...buildTodoTasks(2)]);

    fireEvent.press(screen.getByTestId('home-active-filter-reminder'));

    mockedUseApp.mockReturnValue({
      tasks: buildTodoTasks(2),
      lists: [{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', createdAt: '', sortOrder: 0 }],
      theme,
      completeTask: jest.fn(),
      snoozeTask: jest.fn(),
      notificationGranted: true,
      debugScreenshotMode: false,
      requestNotificationPermission: jest.fn(),
      reorderLists: jest.fn()
    } as any);

    view.rerender(<HomeScreen />);

    expect(screen.getByText('Todo 1')).toBeTruthy();
    expect(screen.getByText('Todo 2')).toBeTruthy();
    expect(screen.queryByText('Aktif hatirlatma yok')).toBeNull();
    expect(screen.queryByText('Su anda acik durumda bildirimli bir gorev gorunmuyor.')).toBeNull();
  });

  it('switches back to reminders when reminders appear before the user picks a filter', () => {
    const view = renderScreen(buildTodoTasks(2));

    expect(screen.getByText('Todo 1')).toBeTruthy();
    expect(screen.queryByText('Reminder 1')).toBeNull();

    mockedUseApp.mockReturnValue({
      tasks: [...buildTodoTasks(2), ...buildReminderTasks(1)],
      lists: [{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', createdAt: '', sortOrder: 0 }],
      theme,
      completeTask: jest.fn(),
      snoozeTask: jest.fn(),
      notificationGranted: true,
      debugScreenshotMode: false,
      requestNotificationPermission: jest.fn(),
      reorderLists: jest.fn()
    } as any);

    view.rerender(<HomeScreen />);

    expect(screen.getByText('Reminder 1')).toBeTruthy();
    expect(screen.queryByText('Todo 1')).toBeNull();
  });

  it('shows the most recently updated To-Do tasks first on the Home screen', () => {
    renderScreen([
      buildTask({
        id: 'todo-oldest',
        title: 'Todo oldest',
        sortOrder: 0,
        taskMode: 'todo',
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-01T08:00:00.000Z',
        nextNotificationAt: null
      }),
      buildTask({
        id: 'todo-2',
        title: 'Todo 2',
        sortOrder: 100,
        taskMode: 'todo',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        nextNotificationAt: null
      }),
      buildTask({
        id: 'todo-3',
        title: 'Todo 3',
        sortOrder: 101,
        taskMode: 'todo',
        createdAt: '2026-04-03T08:00:00.000Z',
        updatedAt: '2026-04-03T08:00:00.000Z',
        nextNotificationAt: null
      }),
      buildTask({
        id: 'todo-4',
        title: 'Todo 4',
        sortOrder: 102,
        taskMode: 'todo',
        createdAt: '2026-04-04T08:00:00.000Z',
        updatedAt: '2026-04-04T08:00:00.000Z',
        nextNotificationAt: null
      }),
      buildTask({
        id: 'todo-5',
        title: 'Todo 5',
        sortOrder: 103,
        taskMode: 'todo',
        createdAt: '2026-04-05T08:00:00.000Z',
        updatedAt: '2026-04-05T08:00:00.000Z',
        nextNotificationAt: null
      }),
      buildTask({
        id: 'todo-6',
        title: 'Todo 6',
        sortOrder: 104,
        taskMode: 'todo',
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
        nextNotificationAt: null
      })
    ]);

    expect(screen.getByText('Todo 2')).toBeTruthy();
    expect(screen.getByText('Todo 3')).toBeTruthy();
    expect(screen.getByText('Todo 4')).toBeTruthy();
    expect(screen.getByText('Todo 5')).toBeTruthy();
    expect(screen.getByText('Todo 6')).toBeTruthy();
    expect(screen.queryByText('Todo oldest')).toBeNull();
    expect(screen.getByTestId('home-active-load-more')).toBeTruthy();
  });

  it('shows the To-Do empty state when the selected filter has no matching tasks', () => {
    renderScreen(buildReminderTasks(2));

    fireEvent.press(screen.getByTestId('home-active-filter-todo'));

    expect(screen.getByText('Aktif To-Do yok')).toBeTruthy();
    expect(screen.getByText('Su anda acik durumda To-Do gorev gorunmuyor.')).toBeTruthy();
    expect(screen.queryByText('Reminder 1')).toBeNull();
  });
});
