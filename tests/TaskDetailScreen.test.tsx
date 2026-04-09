import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TaskDetailScreen from '@/app/tasks/[taskId]/index';
import { useApp } from '@/hooks/useApp';

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null
  },
  router: {
    back: jest.fn()
  },
  useRouter: () => ({
    push: jest.fn()
  }),
  useLocalSearchParams: () => ({
    taskId: 'task-1'
  })
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/components/Screen', () => ({
  Screen: ({ children }: { children: any }) => <>{children}</>
}));

jest.mock('@/components/Card', () => ({
  Card: ({ children }: { children: any }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  }
}));

jest.mock('@/components/TaskCard', () => ({
  TaskCard: () => null
}));

jest.mock('@/components/Button', () => ({
  Button: ({ label, disabled, onPress, testID }: { label: string; disabled?: boolean; onPress?: () => void; testID?: string }) => {
    const { Text } = require('react-native');
    return <Text {...({ testID: testID ?? `button:${label}`, disabled, onPress } as any)}>{label}</Text>;
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
          'taskDetail.title': 'Task details',
          'taskDetail.infoSection': 'Task info',
          'taskDetail.list': 'List',
          'taskDetail.taskType': 'Task type',
          'taskDetail.notification': 'Reminder',
          'taskDetail.start': 'Start',
          'taskDetail.created': 'Created',
          'taskDetail.lastNotification': 'Last reminder',
          'taskDetail.nextNotification': 'Next reminder',
          'taskDetail.completedAt': 'Completed',
          'taskDetail.completedCycle': 'Last cycle completed',
          'taskDetail.status': 'Status',
          'taskDetail.weekday': 'Day of week',
          'taskDetail.todoNote': 'To-do note',
          'taskDetail.recurringNote': 'Recurring note',
          'taskDetail.recurringStoppedNote': 'Recurring stopped note',
          'taskDetail.edit': 'Edit',
          'taskDetail.completeTodo': 'Done',
          'taskDetail.completeRecurring': 'Complete this cycle',
          'taskDetail.completeRecurringAndStop': 'Complete and finish',
          'taskDetail.completeSingle': 'Complete',
          'taskDetail.delete': 'Delete',
          'taskDetail.reactivateTodo': 'Mark as not done',
          'taskDetail.reactivate': 'Reactivate',
          'taskDetail.resume': 'Resume',
          'taskDetail.pause': 'Pause',
          'taskDetail.snooze10': 'Snooze 10 min',
          'taskDetail.snooze1h': 'Snooze 1 hour',
          'taskDetail.snoozeEvening': 'Snooze until evening',
          'taskDetail.snoozeTomorrow': 'Remind tomorrow',
          'taskCard.modeSingle': 'One-time reminder',
          'taskCard.modeRecurring': 'Recurring reminder',
          'taskCard.statusActive': 'Active',
          'taskCard.statusOverdue': 'Overdue',
          'taskCard.statusSnoozed': 'Snoozed',
          'taskCard.statusCompleted': 'Completed',
          'common.paused': 'Paused',
          'common.none': 'None',
          'common.noList': 'No list',
          'common.cancel': 'Cancel',
          'common.delete': 'Delete'
        } as Record<string, string>
      )[key] ?? key
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

const baseTheme = {
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

function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Pay rent',
    description: '',
    listId: 'list-1',
    sortOrder: 0,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    startReminderType: 'today_at_time',
    startDateTime: '2030-01-01T09:00:00.000Z',
    startReminderWeekday: null,
    startReminderDayOfMonth: null,
    startReminderTime: '09:00',
    startReminderUsesLastDay: 0,
    taskMode: 'single',
    repeatIntervalType: 'preset',
    repeatIntervalValue: 1,
    repeatIntervalUnit: 'hours',
    status: 'active',
    lastNotificationAt: null,
    nextNotificationAt: '2030-01-01T09:00:00.000Z',
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: null,
    ...overrides
  };
}

function buildUseAppValue(taskOverrides: Record<string, unknown> = {}) {
  return {
    tasks: [buildTask(taskOverrides)],
    lists: [{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', createdAt: '', sortOrder: 0 }],
    completeTask: jest.fn(),
    completeTaskPermanently: jest.fn(),
    snoozeTask: jest.fn(),
    pauseTask: jest.fn(),
    resumeTask: jest.fn(),
    reactivateTask: jest.fn(),
    removeTask: jest.fn(),
    theme: baseTheme,
    isTaskMutating: jest.fn().mockReturnValue(true)
  } as any;
}

beforeEach(() => {
  mockedUseApp.mockReturnValue(buildUseAppValue());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('TaskDetailScreen', () => {
  it('disables task actions while the task mutation is running', () => {
    render(<TaskDetailScreen />);

    expect(screen.getByTestId('task-detail-edit').props.disabled).toBe(true);
    expect(screen.getByTestId('task-detail-complete').props.disabled).toBe(true);
    expect(screen.getByTestId('task-detail-delete').props.disabled).toBe(true);
    expect(screen.getByTestId('button:Pause').props.disabled).toBe(true);
    expect(screen.getByTestId('task-detail-snooze-10m').props.disabled).toBe(true);
    expect(screen.getByTestId('task-detail-snooze-1h').props.disabled).toBe(true);
    expect(screen.getByTestId('task-detail-snooze-evening').props.disabled).toBe(true);
    expect(screen.getByTestId('task-detail-snooze-tomorrow').props.disabled).toBe(true);
  });

  it('shows both recurring completion actions and disables them while busy', () => {
    mockedUseApp.mockReturnValue(buildUseAppValue({ taskMode: 'recurring' }));

    render(<TaskDetailScreen />);

    expect(screen.getByTestId('task-detail-complete').props.disabled).toBe(true);
    expect(screen.getByTestId('task-detail-complete-and-stop').props.disabled).toBe(true);
  });

  it('permanently completes an active recurring task from the detail action', () => {
    const appValue = buildUseAppValue({ taskMode: 'recurring' });
    const completeTaskPermanently = appValue.completeTaskPermanently as jest.Mock;
    mockedUseApp.mockReturnValue({
      ...appValue,
      isTaskMutating: jest.fn().mockReturnValue(false)
    });

    render(<TaskDetailScreen />);

    fireEvent.press(screen.getByTestId('task-detail-complete-and-stop'));

    expect(completeTaskPermanently).toHaveBeenCalledTimes(1);
    expect(completeTaskPermanently).toHaveBeenCalledWith('task-1');
  });

  it('logs permanent completion failures without crashing the detail action', async () => {
    const error = new Error('boom');
    const appValue = buildUseAppValue({ taskMode: 'recurring' });
    const completeTaskPermanently = appValue.completeTaskPermanently as jest.Mock;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      completeTaskPermanently.mockRejectedValueOnce(error);
      mockedUseApp.mockReturnValue({
        ...appValue,
        isTaskMutating: jest.fn().mockReturnValue(false)
      });

      render(<TaskDetailScreen />);

      fireEvent.press(screen.getByTestId('task-detail-complete-and-stop'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to permanently complete recurring task task-1.', error);
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('hides completion actions once a recurring task is already completed', () => {
    mockedUseApp.mockReturnValue({
      ...buildUseAppValue({
        taskMode: 'recurring',
        status: 'completed',
        completedAt: '2030-01-01T09:00:00.000Z',
        nextNotificationAt: null
      }),
      isTaskMutating: jest.fn().mockReturnValue(false)
    } as any);

    render(<TaskDetailScreen />);

    expect(screen.queryByTestId('task-detail-complete')).toBeNull();
    expect(screen.queryByTestId('task-detail-complete-and-stop')).toBeNull();
  });

  it('snoozes until tomorrow at the task reminder time', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 0, 1, 16, 45, 0, 0));

    const appValue = buildUseAppValue({ startReminderTime: '09:30' });
    const snoozeTask = appValue.snoozeTask as jest.Mock;
    mockedUseApp.mockReturnValue({
      ...appValue,
      isTaskMutating: jest.fn().mockReturnValue(false)
    });

    render(<TaskDetailScreen />);

    fireEvent.press(screen.getByTestId('task-detail-snooze-tomorrow'));

    expect(snoozeTask).toHaveBeenCalledTimes(1);

    const [, snoozedUntil] = snoozeTask.mock.calls[0] as [string, Date];
    expect(snoozedUntil.getFullYear()).toBe(2030);
    expect(snoozedUntil.getMonth()).toBe(0);
    expect(snoozedUntil.getDate()).toBe(2);
    expect(snoozedUntil.getHours()).toBe(9);
    expect(snoozedUntil.getMinutes()).toBe(30);
  });
});
