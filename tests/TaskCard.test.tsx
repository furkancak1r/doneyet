import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TaskCard } from '@/components/TaskCard';
import { useApp } from '@/hooks/useApp';
import { formatDateTimeTR } from '@/utils/date';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  const { View } = require('react-native');

  return ({
    children,
    renderLeftActions,
    renderRightActions
  }: {
    children: React.ReactNode;
    renderLeftActions?: () => React.ReactNode;
    renderRightActions?: () => React.ReactNode;
  }) => (
    <View>
      {renderLeftActions ? renderLeftActions() : null}
      {children}
      {renderRightActions ? renderRightActions() : null}
    </View>
  );
});

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
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
          'common.paused': 'Paused',
          'common.noList': 'No list',
          'common.noNotification': 'No reminder',
          'taskCard.modeTodo': 'To-Do',
          'taskCard.modeRecurring': 'Recurring',
          'taskCard.modeSingle': 'One-time',
          'taskCard.statusOverdue': 'Overdue',
          'taskCard.statusSnoozed': 'Snoozed',
          'taskCard.statusCompleted': 'Completed',
          'taskCard.statusActive': 'Active',
          'taskCard.actionDone': 'Done',
          'taskCard.actionDoneCycle': 'Done cycle',
          'taskCard.actionFinish': 'Finish',
          'taskCard.actionSnooze': 'Snooze'
        } as Record<string, string>
      )[key] ?? key
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;
let reduceMotionSpy: jest.SpiedFunction<typeof AccessibilityInfo.isReduceMotionEnabled>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseApp.mockReturnValue({
    theme: {
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
    }
  } as any);
  reduceMotionSpy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TaskCard', () => {
  it('starts the swipe hint when opted in', async () => {
    const onSwipeHintStarted = jest.fn();

    render(
      <TaskCard
        task={{
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
          completedAt: null
        }}
        swipeHintDirection="two-way"
        onSwipeHintStarted={onSwipeHintStarted}
      />
    );

    await waitFor(() => expect(onSwipeHintStarted).toHaveBeenCalledTimes(1));
  });

  it('does not start the swipe hint while disabled', () => {
    const onSwipeHintStarted = jest.fn();

    render(
      <TaskCard
        task={{
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
          completedAt: null
        }}
        disabled
        swipeHintDirection="two-way"
        onSwipeHintStarted={onSwipeHintStarted}
      />
    );

    expect(onSwipeHintStarted).not.toHaveBeenCalled();
  });

  it('does not start the swipe hint while dragging', () => {
    const onSwipeHintStarted = jest.fn();

    render(
      <TaskCard
        task={{
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
          completedAt: null
        }}
        dragging
        swipeHintDirection="two-way"
        onSwipeHintStarted={onSwipeHintStarted}
      />
    );

    expect(onSwipeHintStarted).not.toHaveBeenCalled();
  });

  it('skips the swipe hint when reduce motion is enabled', async () => {
    const onSwipeHintStarted = jest.fn();
    reduceMotionSpy.mockResolvedValue(true);

    render(
      <TaskCard
        task={{
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
          completedAt: null
        }}
        swipeHintDirection="two-way"
        onSwipeHintStarted={onSwipeHintStarted}
      />
    );

    await waitFor(() => expect(reduceMotionSpy).toHaveBeenCalledTimes(1));
    expect(onSwipeHintStarted).not.toHaveBeenCalled();
  });

  it('blocks press and long-press interactions while disabled', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();

    render(
      <TaskCard
        task={{
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
          completedAt: null
        }}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled
      />
    );

    fireEvent.press(screen.getByTestId('task-card-task-1'));
    fireEvent(screen.getByTestId('task-card-task-1'), 'longPress');

    expect(onPress).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('task-card-task-1').props.accessibilityState).toEqual({ disabled: true });
  });

  it('renders both recurring completion swipe actions when finishing is available', () => {
    render(
      <TaskCard
        task={{
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
          taskMode: 'recurring',
          repeatIntervalType: 'preset',
          repeatIntervalValue: 1,
          repeatIntervalUnit: 'hours',
          status: 'active',
          lastNotificationAt: null,
          nextNotificationAt: '2030-01-01T09:00:00.000Z',
          snoozedUntil: null,
          notificationIdsJson: '[]',
          completedAt: null
        }}
        onComplete={jest.fn()}
        onFinishRecurringTask={jest.fn()}
      />
    );

    expect(screen.getByText('Done cycle')).toBeTruthy();
    expect(screen.getByText('Finish')).toBeTruthy();
  });

  it('shows the completion timestamp for completed recurring tasks without a next reminder', () => {
    const completedAt = '2030-01-03T10:30:00.000Z';
    const startDateTime = '2030-01-01T09:00:00.000Z';

    render(
      <TaskCard
        task={{
          id: 'task-1',
          title: 'Pay rent',
          description: '',
          listId: 'list-1',
          sortOrder: 0,
          createdAt: '2026-04-01T08:00:00.000Z',
          updatedAt: '2026-04-01T08:00:00.000Z',
          startReminderType: 'today_at_time',
          startDateTime,
          startReminderWeekday: null,
          startReminderDayOfMonth: null,
          startReminderTime: '09:00',
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
          completedAt
        }}
      />
    );

    expect(screen.getByText(formatDateTimeTR(completedAt))).toBeTruthy();
    expect(screen.queryByText(formatDateTimeTR(startDateTime))).toBeNull();
  });
});
