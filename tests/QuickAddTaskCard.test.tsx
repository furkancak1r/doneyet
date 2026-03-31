import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { QuickAddTaskCard } from '@/features/tasks/QuickAddTaskCard';
import { useApp } from '@/hooks/useApp';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'common.save': 'Kaydet',
          'quickAdd.title': 'Hızlı ekle',
          'quickAdd.placeholder': 'Yeni görev yaz',
          'quickAdd.modeHint': 'Görev davranışı seç',
          'quickAdd.modeReminder': 'Hatırlatma',
          'quickAdd.modeTodo': 'To-Do',
          'quickAdd.reminderBadge': 'Bildirimli',
          'quickAdd.todoBadge': 'Bildirimsiz',
          'quickAdd.reminderDescription': 'Hatırlatmalar planlıdır.',
          'quickAdd.todoDescription': 'To-Do görevler sade tutulur.',
          'quickAdd.listDivider': 'Liste seçimi',
          'quickAdd.listHint': 'Bu görev hangi listeye ait olacak?',
          'quickAdd.helper': 'Liste yardımı',
          'quickAdd.continue': 'Devam et'
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

function renderCard(overrides?: {
  createTask?: jest.Mock;
  requestQuickAddReset?: jest.Mock;
  quickAddResetVersion?: number;
}) {
  const createTask = overrides?.createTask ?? jest.fn().mockResolvedValue({ id: 'task-1' });
  const requestQuickAddReset = overrides?.requestQuickAddReset ?? jest.fn();

  mockedUseApp.mockReturnValue({
    lists: [
      { id: 'list-1', name: 'Kişisel', color: '#2A6EF0', icon: 'list-outline', createdAt: '', updatedAt: '', sortOrder: 0 }
    ],
    theme,
    quickAddResetVersion: overrides?.quickAddResetVersion ?? 0,
    createTask,
    requestQuickAddReset,
    settings: {
      defaultStartTime: '09:00'
    }
  } as any);

  render(<QuickAddTaskCard defaultListId="list-1" />);

  return {
    createTask,
    requestQuickAddReset
  };
}

describe('QuickAddTaskCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Devam et" by default for reminder tasks', () => {
    renderCard();

    expect(screen.getByText('Devam et')).toBeTruthy();
  });

  it('shows "Kaydet" when To-Do is selected', () => {
    renderCard();

    fireEvent.press(screen.getByText('To-Do'));

    expect(screen.getByText('Kaydet')).toBeTruthy();
  });

  it('creates a To-Do task directly with the expected payload', async () => {
    const { createTask, requestQuickAddReset } = renderCard();

    fireEvent.changeText(screen.getByPlaceholderText('Yeni görev yaz'), 'Market alışverişi');
    fireEvent.press(screen.getByText('To-Do'));
    fireEvent.press(screen.getByText('Kaydet'));

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));

    expect(createTask).toHaveBeenCalledWith({
      title: 'Market alışverişi',
      description: '',
      listId: 'list-1',
      startReminderType: 'today_at_time',
      startDateTime: expect.any(Date),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '09:00',
      startReminderUsesLastDay: false,
      taskMode: 'todo',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 1,
      repeatIntervalUnit: 'hours'
    });
    expect(requestQuickAddReset).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('keeps the reminder flow on the new-task route', () => {
    renderCard();

    fireEvent.changeText(screen.getByPlaceholderText('Yeni görev yaz'), 'Doktor randevusu');
    fireEvent.press(screen.getByText('Devam et'));

    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/tasks/new',
      params: {
        title: 'Doktor randevusu',
        listId: 'list-1',
        taskMode: 'single'
      }
    });
  });

  it('does not create a task directly in reminder mode', () => {
    const { createTask } = renderCard();

    fireEvent.changeText(screen.getByPlaceholderText('Yeni görev yaz'), 'Su iç');
    fireEvent.press(screen.getByText('Devam et'));

    expect(createTask).not.toHaveBeenCalled();
  });

  it('ignores repeated save presses while a To-Do save is in flight', async () => {
    let resolveCreateTask!: (value: { id: string }) => void;
    const createTaskPromise = new Promise<{ id: string }>((resolve) => {
      resolveCreateTask = resolve;
    });
    const createTask = jest.fn().mockReturnValue(createTaskPromise);

    renderCard({ createTask });

    fireEvent.changeText(screen.getByPlaceholderText('Yeni görev yaz'), 'Bitmeyen görev');
    fireEvent.press(screen.getByText('To-Do'));
    const saveButton = screen.getByText('Kaydet');
    fireEvent.press(saveButton);
    fireEvent.press(saveButton);

    expect(createTask).toHaveBeenCalledTimes(1);

    resolveCreateTask({ id: 'task-1' });
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
  });
});
