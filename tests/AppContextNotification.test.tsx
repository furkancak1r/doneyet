import { useEffect } from 'react';
import { Platform } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { AppProvider, useApp } from '@/context/AppContext';

const mockPush = jest.fn();

const mockInitializeDatabase = jest.fn().mockResolvedValue(undefined);
const mockListTasks = jest.fn().mockResolvedValue([
  {
    id: 'task-1',
    title: 'Recurring task',
    description: '',
    listId: 'list-1',
    sortOrder: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    startReminderType: 'today_at_time',
    startDateTime: '2025-01-31T09:00:00.000Z',
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
    nextNotificationAt: '2025-01-31T11:00:00.000Z',
    snoozedUntil: null,
    notificationIdsJson: '[]',
    completedAt: null
  }
]);
const mockGetTask = jest.fn().mockResolvedValue(null);
const mockCreateTaskRecord = jest.fn();
const mockUpdateTaskRecord = jest.fn();
const mockCompleteTaskRecord = jest.fn().mockResolvedValue({
  id: 'task-1',
  taskMode: 'recurring',
  status: 'active'
});
const mockCompleteTaskPermanentlyRecord = jest.fn().mockResolvedValue({
  id: 'task-1',
  taskMode: 'recurring',
  status: 'completed'
});
const mockRecordTaskReminderDelivery = jest.fn().mockResolvedValue({
  id: 'task-1',
  taskMode: 'recurring',
  status: 'active',
  lastNotificationAt: '2025-01-31T10:00:00.000Z'
});
const mockPauseTaskRecord = jest.fn();
const mockResumeTaskRecord = jest.fn();
const mockSnoozeTaskRecord = jest.fn();
const mockReactivateCompletedTask = jest.fn();
const mockRemoveTaskRecord = jest.fn();
const mockReorderTasksRecord = jest.fn();

const mockListAllLists = jest.fn().mockResolvedValue([
  { id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', sortOrder: 0, createdAt: '' }
]);
const mockCreateListRecord = jest.fn();
const mockUpdateListRecord = jest.fn();
const mockReorderListsRecord = jest.fn();
const mockDeleteListRecord = jest.fn();
const mockSyncLocalizedDefaultLists = jest.fn().mockResolvedValue(undefined);

const mockGetSettings = jest.fn().mockResolvedValue({
  id: 'singleton',
  defaultStartTime: '09:00',
  soundEnabled: 1,
  vibrationEnabled: 1,
  autoHideCompletedTasks: 0,
  onboardingCompleted: 1,
  themeMode: 'system',
  language: 'en'
});
const mockUpdateSettingsRecord = jest.fn();

const mockImportBackupJson = jest.fn();
const mockCreateBackupPayload = jest.fn();
const mockReplaceBackupJson = jest.fn();

const mockFetchTaskCompletionHistory = jest.fn().mockResolvedValue([]);

const mockSyncForegroundAppState = jest.fn();
const mockConfigureNotificationHandling = jest.fn().mockResolvedValue(undefined);
const mockEnsureNotificationPermissions = jest.fn();
const mockGetNotificationPermissions = jest.fn().mockResolvedValue({ granted: true });
const mockResolveSnoozeTime = jest.fn();
const mockRestoreAllTaskSchedules = jest.fn().mockResolvedValue(undefined);
const mockSetAppLanguage = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true)
  })
}));

jest.mock('@/db/schema', () => ({
  initializeDatabase: (...args: unknown[]) => mockInitializeDatabase(...args)
}));

jest.mock('@/services/taskService', () => ({
  listTasks: (...args: unknown[]) => mockListTasks(...args),
  getTask: (...args: unknown[]) => mockGetTask(...args),
  createTask: (...args: unknown[]) => mockCreateTaskRecord(...args),
  updateTask: (...args: unknown[]) => mockUpdateTaskRecord(...args),
  completeTask: (...args: unknown[]) => mockCompleteTaskRecord(...args),
  completeTaskPermanently: (...args: unknown[]) => mockCompleteTaskPermanentlyRecord(...args),
  recordTaskReminderDelivery: (...args: unknown[]) => mockRecordTaskReminderDelivery(...args),
  pauseTask: (...args: unknown[]) => mockPauseTaskRecord(...args),
  resumeTask: (...args: unknown[]) => mockResumeTaskRecord(...args),
  snoozeTask: (...args: unknown[]) => mockSnoozeTaskRecord(...args),
  reactivateCompletedTask: (...args: unknown[]) => mockReactivateCompletedTask(...args),
  removeTask: (...args: unknown[]) => mockRemoveTaskRecord(...args),
  reorderTasks: (...args: unknown[]) => mockReorderTasksRecord(...args)
}));

jest.mock('@/services/listService', () => ({
  listAllLists: (...args: unknown[]) => mockListAllLists(...args),
  createList: (...args: unknown[]) => mockCreateListRecord(...args),
  updateList: (...args: unknown[]) => mockUpdateListRecord(...args),
  reorderLists: (...args: unknown[]) => mockReorderListsRecord(...args),
  deleteList: (...args: unknown[]) => mockDeleteListRecord(...args),
  syncLocalizedDefaultLists: (...args: unknown[]) => mockSyncLocalizedDefaultLists(...args)
}));

jest.mock('@/services/settingsService', () => ({
  getSettings: (...args: unknown[]) => mockGetSettings(...args),
  updateSettings: (...args: unknown[]) => mockUpdateSettingsRecord(...args)
}));

jest.mock('@/services/backupService', () => ({
  importBackupJson: (...args: unknown[]) => mockImportBackupJson(...args),
  createBackupPayload: (...args: unknown[]) => mockCreateBackupPayload(...args),
  replaceBackupJson: (...args: unknown[]) => mockReplaceBackupJson(...args)
}));

jest.mock('@/db/repositories', () => ({
  fetchTaskCompletionHistory: (...args: unknown[]) => mockFetchTaskCompletionHistory(...args)
}));

jest.mock('@/services/appForegroundSync', () => ({
  syncForegroundAppState: (...args: unknown[]) => mockSyncForegroundAppState(...args)
}));

jest.mock('@/services/notificationService', () => ({
  configureNotificationHandling: (...args: unknown[]) => mockConfigureNotificationHandling(...args),
  ensureNotificationPermissions: (...args: unknown[]) => mockEnsureNotificationPermissions(...args),
  getNotificationPermissions: (...args: unknown[]) => mockGetNotificationPermissions(...args),
  resolveSnoozeTime: (...args: unknown[]) => mockResolveSnoozeTime(...args)
}));

jest.mock('@/services/schedulerService', () => ({
  restoreAllTaskSchedules: (...args: unknown[]) => mockRestoreAllTaskSchedules(...args)
}));

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => key
  },
  setAppLanguage: (...args: unknown[]) => mockSetAppLanguage(...args)
}));

let capturedHandleNotificationResponse: ((response: any) => Promise<void>) | null = null;

function CaptureHandleNotificationResponse() {
  const { handleNotificationResponse } = useApp();

  useEffect(() => {
    capturedHandleNotificationResponse = handleNotificationResponse;
  }, [handleNotificationResponse]);

  return null;
}

describe('AppContext notification responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios'
    });
    capturedHandleNotificationResponse = null;
  });

  it('refreshes after iOS native actions without routing or duplicating the mutation', async () => {
    render(
      <AppProvider>
        <CaptureHandleNotificationResponse />
      </AppProvider>
    );

    await waitFor(() => expect(capturedHandleNotificationResponse).toBeTruthy());

    await capturedHandleNotificationResponse?.({
      actionIdentifier: 'mark_done',
      notification: {
        request: {
          identifier: 'notif-1',
          content: {
            data: {
              taskId: 'task-1',
              scheduledFor: '2025-01-31T10:00:00.000Z'
            }
          }
        }
      }
    });

    expect(mockRecordTaskReminderDelivery).not.toHaveBeenCalled();
    expect(mockCompleteTaskRecord).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('records the delivered recurring reminder for plain notification taps without completing the task', async () => {
    render(
      <AppProvider>
        <CaptureHandleNotificationResponse />
      </AppProvider>
    );

    await waitFor(() => expect(capturedHandleNotificationResponse).toBeTruthy());

    await capturedHandleNotificationResponse?.({
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      notification: {
        request: {
          identifier: 'notif-1',
          content: {
            data: {
              taskId: 'task-1',
              scheduledFor: '2025-01-31T10:00:00.000Z'
            }
          }
        }
      }
    });

    await waitFor(() => {
      expect(mockRecordTaskReminderDelivery).toHaveBeenCalledWith('task-1', new Date('2025-01-31T10:00:00.000Z'));
      expect(mockCompleteTaskRecord).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/tasks/task-1');
    });
  });
});
