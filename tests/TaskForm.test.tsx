import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TaskForm } from '@/features/tasks/TaskForm';
import { useApp } from '@/hooks/useApp';
import { Task } from '@/types/domain';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

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
          'taskForm.title': 'Task title',
          'taskForm.titlePlaceholder': 'For example: Pay the electricity bill',
          'taskForm.description': 'Description',
          'taskForm.descriptionPlaceholder': 'Optional description',
          'taskForm.typeSection': 'Task behavior',
          'taskForm.typeHint': 'Choose the behavior.',
          'taskForm.reminder': 'Reminder',
          'taskForm.todo': 'To-Do',
          'taskForm.reminderCardBadge': 'With reminders',
          'taskForm.todoCardBadge': 'No reminders',
          'taskForm.reminderCardDescription': 'Receives reminders.',
          'taskForm.todoCardDescription': 'Simple item.',
          'taskForm.todoHelper': 'No reminder is scheduled.',
          'taskForm.reminderHelper': 'Reminder tasks receive notifications.',
          'taskForm.sectionDivider': 'List selection',
          'taskForm.listSection': 'Task list',
          'taskForm.listHint': 'Choose the list.',
          'taskForm.subtypeSection': 'Reminder subtype',
          'taskForm.singleSubtype': 'One-time',
          'taskForm.recurringSubtype': 'Recurring',
          'taskForm.recurringHelper': 'Recurring tasks keep asking.',
          'taskForm.singleHelper': 'One-time tasks end when completed.',
          'taskForm.startSection': 'Start',
          'taskForm.startExact': 'Exact date',
          'taskForm.startToday': 'Today',
          'taskForm.startTomorrow': 'Tomorrow',
          'taskForm.startWeekly': 'Weekly',
          'taskForm.startMonthly': 'Monthly',
          'taskForm.recurringStartHelper': 'Recurring reminders use calendar-based starts.',
          'taskForm.dateLabel': 'Date',
          'taskForm.timeLabel': 'Time',
          'taskForm.repeatSection': 'Repeat interval',
          'taskForm.repeatCustom': 'Custom',
          'taskForm.repeatValue': 'Value',
          'taskForm.repeatValuePlaceholder': 'Repeat value',
          'taskForm.repeatMinutes': 'Minutes',
          'taskForm.repeatHours': 'Hours',
          'taskForm.repeatRequired': 'Choose a repeat interval before saving.',
          'taskForm.validationTitleAndList': 'Title and list are required.',
          'taskForm.validationRepeatRequired': 'Select a repeat interval.',
          'taskForm.validationRepeatPositive': 'Repeat interval must be positive.',
          'taskForm.validationFieldsHidden': 'Reminder fields are hidden for To-Do tasks.',
          'repeat.30m': '30 min',
          'repeat.1h': '1 hour',
          'repeat.2h': '2 hours',
          'repeat.3h': '3 hours',
          'repeat.6h': '6 hours',
          'repeat.12h': '12 hours',
          'repeat.24h': '24 hours'
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

function buildTask(overrides: Partial<Task> = {}): Task {
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

describe('TaskForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApp.mockReturnValue({
      lists: [{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', createdAt: '', updatedAt: '', sortOrder: 0 }],
      settings: { defaultStartTime: '09:00' },
      theme
    } as any);
  });

  it('ignores repeated submit presses while the task is being saved', async () => {
    let resolveSubmit!: () => void;
    const onSubmit = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      })
    );

    render(<TaskForm initialTaskMode="todo" submitLabel="Save" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('For example: Pay the electricity bill'), 'Morning walk');
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('uses a numeric keyboard for the custom repeat value input', () => {
    render(<TaskForm submitLabel="Save" onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByText('Custom'));

    const repeatValueInput = screen.getByPlaceholderText('Repeat value');

    expect(repeatValueInput.props.keyboardType).toBe('number-pad');
    expect(repeatValueInput.props.inputMode).toBe('numeric');
  });

  it('defaults reminder mode back to recurring when starting from a To-Do', () => {
    render(<TaskForm initialTaskMode="todo" submitLabel="Save" onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByText('Reminder'));

    expect(screen.queryByText('Exact date')).toBeNull();
    expect(screen.getByText('Recurring tasks keep asking.')).toBeTruthy();
    expect(screen.getByText('Repeat interval')).toBeTruthy();
  });

  it('shows repeat controls for one-time reminders', () => {
    render(<TaskForm initialTaskMode="single" submitLabel="Save" onSubmit={jest.fn()} />);

    expect(screen.getByText('Repeat interval')).toBeTruthy();
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(screen.getByText('Choose a repeat interval before saving.')).toBeTruthy();
  });

  it('requires a repeat interval for new single reminders', async () => {
    const onSubmit = jest.fn();

    render(<TaskForm initialTaskMode="single" submitLabel="Save" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('For example: Pay the electricity bill'), 'Morning walk');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText('Select a repeat interval.')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('preserves the saved repeat settings when editing an existing single reminder', async () => {
    const onSubmit = jest.fn();

    render(
      <TaskForm
        initialTask={buildTask({
          repeatIntervalType: 'custom',
          repeatIntervalValue: 3,
          repeatIntervalUnit: 'hours',
          taskMode: 'single'
        })}
        submitLabel="Save"
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          taskMode: 'single',
          repeatIntervalType: 'custom',
          repeatIntervalValue: 3,
          repeatIntervalUnit: 'hours'
        })
      )
    );
  });

  it('still requires a repeat interval for recurring reminders', async () => {
    const onSubmit = jest.fn();

    render(<TaskForm submitLabel="Save" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('For example: Pay the electricity bill'), 'Quarterly review');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText('Select a repeat interval.')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows repeat controls again when switching back from a To-Do to reminders', () => {
    render(<TaskForm initialTaskMode="single" submitLabel="Save" onSubmit={jest.fn()} />);

    expect(screen.getByText('Repeat interval')).toBeTruthy();

    fireEvent.press(screen.getByText('To-Do'));
    expect(screen.queryByText('Repeat interval')).toBeNull();

    fireEvent.press(screen.getByText('Reminder'));
    fireEvent.press(screen.getByText('Recurring'));

    expect(screen.getByText('Repeat interval')).toBeTruthy();
    expect(screen.getByText('Choose a repeat interval before saving.')).toBeTruthy();
  });
});
