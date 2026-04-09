import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CompletedScreen from '@/app/(tabs)/completed';
import { useApp } from '@/hooks/useApp';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn()
  }
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/components/Screen', () => ({
  Screen: ({ children }: { children: any }) => <>{children}</>
}));

jest.mock('@/components/Section', () => ({
  Section: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{title}</Text>;
  }
}));

jest.mock('@/components/DateTimeField', () => ({
  DateTimeField: ({ label }: { label: string }) => {
    const { Text } = require('react-native');
    return <Text>{label}</Text>;
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
          'completed.title': 'Completed',
          'completed.modeFilterLabel': 'Type',
          'completed.filterAll': 'All',
          'completed.filterReminder': 'Reminder',
          'completed.filterTodo': 'To-Do',
          'completed.filterCycles': 'Cycles',
          'completed.listFilterLabel': 'List',
          'completed.listAll': 'All lists',
          'completed.dateFilterLabel': 'Date',
          'completed.dateToday': 'Today',
          'completed.dateLast7': 'Last 7 days',
          'completed.dateLast30': 'Last 30 days',
          'completed.dateAllTime': 'All time',
          'completed.dateCustom': 'Custom range',
          'completed.customStartLabel': 'Start date',
          'completed.customEndLabel': 'End date',
          'completed.emptyTitle': 'No completed tasks',
          'completed.emptyDescription': 'Completed items will appear here.',
          'completed.emptyReminderTitle': 'No completed reminders',
          'completed.emptyReminderDescription': 'Completed one-time reminders will appear here.',
          'completed.emptyTodoTitle': 'No completed To-Do items',
          'completed.emptyTodoDescription': 'Completed To-Do tasks will appear here.',
          'completed.emptyCyclesTitle': 'No completed cycles',
          'completed.emptyCyclesDescription': 'Completed recurring cycles will appear here.',
          'completed.cycleHistory': 'Cycle history',
          'completed.cycleReadOnly': 'This entry is kept as history only and does not change the active task.',
          'taskCard.modeTodo': 'To-Do',
          'taskCard.modeRecurring': 'Recurring',
          'taskCard.modeSingle': 'One-time reminder',
          'taskCard.statusCompleted': 'Completed',
          'common.noList': 'No list'
        } as Record<string, string>
      )[key] ?? key
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;
const pushMock = router.push as jest.Mock;

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

describe('CompletedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApp.mockReturnValue({
      tasks: [
        {
          id: 'task-reminder',
          title: 'Pay rent',
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
          completedAt: '2030-01-02T09:00:00.000Z'
        },
        {
          id: 'task-recurring',
          title: 'Weekly review',
          description: '',
          listId: 'list-1',
          sortOrder: 1,
          createdAt: '2025-03-01T00:00:00.000Z',
          updatedAt: '2025-03-01T00:00:00.000Z',
          startReminderType: 'today_at_time',
          startDateTime: '2025-03-01T08:00:00.000Z',
          startReminderWeekday: null,
          startReminderDayOfMonth: null,
          startReminderTime: '08:00',
          startReminderUsesLastDay: 0,
          taskMode: 'recurring',
          repeatIntervalType: 'preset',
          repeatIntervalValue: 1,
          repeatIntervalUnit: 'hours',
          status: 'completed',
          lastNotificationAt: null,
          nextNotificationAt: null,
          snoozedUntil: null,
          notificationIdsJson: '[]',
          completedAt: '2030-01-03T10:00:00.000Z'
        },
        {
          id: 'task-todo',
          title: 'Buy fruit',
          description: '',
          listId: 'list-2',
          sortOrder: 1,
          createdAt: '2025-03-01T00:00:00.000Z',
          updatedAt: '2025-03-01T00:00:00.000Z',
          startReminderType: 'today_at_time',
          startDateTime: '2025-03-01T08:00:00.000Z',
          startReminderWeekday: null,
          startReminderDayOfMonth: null,
          startReminderTime: '08:00',
          startReminderUsesLastDay: 0,
          taskMode: 'todo',
          repeatIntervalType: 'preset',
          repeatIntervalValue: 1,
          repeatIntervalUnit: 'hours',
          status: 'completed',
          lastNotificationAt: null,
          nextNotificationAt: null,
          snoozedUntil: null,
          notificationIdsJson: '[]',
          completedAt: '2030-01-01T09:00:00.000Z'
        }
      ],
      taskCompletionHistory: [
        {
          id: 'completion-1',
          taskId: 'task-cycle',
          taskTitleSnapshot: 'Weekly cleanup',
          taskDescriptionSnapshot: 'Reset the house',
          taskModeSnapshot: 'recurring',
          listId: 'list-1',
          listNameSnapshot: 'Focus',
          completedAt: '2030-01-03T09:00:00.000Z'
        }
      ],
      lists: [
        { id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', sortOrder: 0, createdAt: '' },
        { id: 'list-2', name: 'Home', color: '#2F7A56', icon: 'home-outline', sortOrder: 1, createdAt: '' }
      ],
      theme,
      isTaskMutating: jest.fn().mockReturnValue(false)
    } as any);
  });

  it('renders mixed completed items and keeps cycle entries read-only', () => {
    render(<CompletedScreen />);

    expect(screen.getByText('Pay rent')).toBeTruthy();
    expect(screen.getByText('Weekly review')).toBeTruthy();
    expect(screen.getByText('Buy fruit')).toBeTruthy();
    expect(screen.getByText('Weekly cleanup')).toBeTruthy();
    expect(screen.getByText('This entry is kept as history only and does not change the active task.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('completed-feed-item-task:task-reminder'));
    expect(pushMock).toHaveBeenCalledWith('/tasks/task-reminder');

    pushMock.mockClear();
    fireEvent.press(screen.getByTestId('completed-feed-item-task:task-recurring'));
    expect(pushMock).toHaveBeenCalledWith('/tasks/task-recurring');

    pushMock.mockClear();
    fireEvent.press(screen.getByTestId('completed-feed-item-cycle:completion-1'));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('filters the feed by mode and reveals custom date controls', () => {
    render(<CompletedScreen />);

    fireEvent.press(screen.getByTestId('completed-mode-todo'));
    expect(screen.getByText('Buy fruit')).toBeTruthy();
    expect(screen.queryByText('Pay rent')).toBeNull();
    expect(screen.queryByText('Weekly cleanup')).toBeNull();

    fireEvent.press(screen.getByTestId('completed-date-custom'));
    expect(screen.getByText('Start date')).toBeTruthy();
    expect(screen.getByText('End date')).toBeTruthy();
  });

  it('navigates only for completed task items', () => {
    render(<CompletedScreen />);

    fireEvent.press(screen.getByTestId('completed-feed-item-task:task-reminder'));
    expect(pushMock).toHaveBeenCalledWith('/tasks/task-reminder');
  });

  it('resets the selected list filter when that list disappears', () => {
    const view = render(<CompletedScreen />);

    fireEvent.press(screen.getByTestId('completed-list-list-2'));
    expect(screen.getByText('Buy fruit')).toBeTruthy();
    expect(screen.queryByText('Pay rent')).toBeNull();

    mockedUseApp.mockReturnValue({
      tasks: [
        {
          id: 'task-reminder',
          title: 'Pay rent',
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
          completedAt: '2030-01-02T09:00:00.000Z'
        }
      ],
      taskCompletionHistory: [
        {
          id: 'completion-1',
          taskId: 'task-cycle',
          taskTitleSnapshot: 'Weekly cleanup',
          taskDescriptionSnapshot: 'Reset the house',
          taskModeSnapshot: 'recurring',
          listId: 'list-1',
          listNameSnapshot: 'Focus',
          completedAt: '2030-01-03T09:00:00.000Z'
        }
      ],
      lists: [{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', sortOrder: 0, createdAt: '' }],
      theme,
      isTaskMutating: jest.fn().mockReturnValue(false)
    } as any);

    view.rerender(<CompletedScreen />);

    return waitFor(() => {
      expect(screen.getByText('Pay rent')).toBeTruthy();
      expect(screen.getByText('Weekly cleanup')).toBeTruthy();
    });
  });
});
