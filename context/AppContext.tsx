import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, useColorScheme, type ColorSchemeName } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppContextValue, AppToastState, ReplaceBackupOptions, ThemePalette } from '@/types/app';
import { AppList, AppSettings, NotificationAction, Task, TaskCompletionHistoryEntry, TaskFormValues, ThemeMode } from '@/types/domain';
import { darkColors, lightColors } from '@/constants/theme';
import { defaultSettings } from '@/constants/settings';
import { initializeDatabase } from '@/db/schema';
import i18n, { setAppLanguage } from '@/i18n';
import { fetchTaskCompletionHistory } from '@/db/repositories';
import {
  completeTask as completeTaskRecord,
  completeTaskPermanently as completeTaskPermanentlyRecord,
  createTask as createTaskRecord,
  getTask,
  recordTaskReminderDelivery,
  listTasks,
  pauseTask as pauseTaskRecord,
  reactivateCompletedTask,
  removeTask as removeTaskRecord,
  reorderTasks as reorderTasksRecord,
  resumeTask as resumeTaskRecord,
  snoozeTask as snoozeTaskRecord,
  updateTask as updateTaskRecord
} from '@/services/taskService';
import {
  createList as createListRecord,
  deleteList as deleteListRecord,
  listAllLists,
  reorderLists as reorderListsRecord,
  syncLocalizedDefaultLists,
  updateList as updateListRecord
} from '@/services/listService';
import { getSettings, updateSettings as updateSettingsRecord } from '@/services/settingsService';
import { importBackupJson, createBackupPayload, replaceBackupJson } from '@/services/backupService';
import { syncForegroundAppState } from '@/services/appForegroundSync';
import { configureNotificationHandling, ensureNotificationPermissions, getNotificationPermissions, resolveSnoozeTime } from '@/services/notificationService';
import { getNotificationResponseScheduledFor, handleNotificationResponseOnce } from '@/services/notificationResponseService';
import { restoreAllTaskSchedules } from '@/services/schedulerService';
import { createSingleFlightTrackedMutationRunner, runTrackedMutation as runTrackedMutationDirect } from '@/context/mutationTracking';
import { reloadWidgets, writeWidgetSnapshot } from '@/native/DoneYetWidget';
import { buildWidgetSnapshot, serializeWidgetSnapshot } from '@/utils/widgetSnapshot';

const AppContext = createContext<AppContextValue | null>(null);

const CREATE_TASK_PENDING_KEY = 'task:create';
const CREATE_LIST_PENDING_KEY = 'list:create';
const REORDER_LISTS_PENDING_KEY = 'lists:reorder';
const SETTINGS_PENDING_KEY = 'settings:update';
const IMPORT_BACKUP_PENDING_KEY = 'backup:import';
const REQUEST_PERMISSION_PENDING_KEY = 'notifications:permission';
const notificationActionIdentifiers = new Set<string>([
  'mark_done',
  'mark_done_forever',
  'snooze_10_min',
  'snooze_1_hour',
  'snooze_evening',
  'snooze_tomorrow'
]);

function isNotificationActionIdentifier(value: string): value is NotificationAction {
  return notificationActionIdentifiers.has(value);
}

function getTaskPendingKey(taskId: string): string {
  return `task:${taskId}`;
}

function getListPendingKey(listId: string): string {
  return `list:${listId}`;
}

function getReorderTasksPendingKey(listId: string): string {
  return `tasks:reorder:${listId}`;
}

function resolvePalette(themeMode: ThemeMode, systemMode: ColorSchemeName): ThemePalette {
  if (themeMode === 'dark' || (themeMode === 'system' && systemMode === 'dark')) {
    return darkColors;
  }

  return lightColors;
}

async function loadCoreAppData(): Promise<{
  lists: AppList[];
  tasks: Task[];
  settings: AppSettings;
  notificationGranted: boolean;
}> {
  const [lists, tasks, settings, permissions] = await Promise.all([
    listAllLists(),
    listTasks(),
    getSettings(),
    getNotificationPermissions()
  ]);

  return {
    lists,
    tasks,
    settings,
    notificationGranted: permissions.granted
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<AppList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCompletionHistory, setTaskCompletionHistory] = useState<TaskCompletionHistoryEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [toast, setToast] = useState<AppToastState | null>(null);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [debugScreenshotMode, setDebugScreenshotMode] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [quickAddResetVersion, setQuickAddResetVersion] = useState(0);
  const nextToastIdRef = useRef(1);
  const refreshTaskCompletionHistory = useCallback(async () => {
    const nextTaskCompletionHistory = await fetchTaskCompletionHistory();
    setTaskCompletionHistory(nextTaskCompletionHistory);
    return nextTaskCompletionHistory;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await loadCoreAppData();
      await setAppLanguage(snapshot.settings.language);
      await syncLocalizedDefaultLists();
      const localizedSnapshot = await loadCoreAppData();
      setLists(localizedSnapshot.lists);
      setTasks(localizedSnapshot.tasks);
      setSettings(localizedSnapshot.settings);
      setThemeMode(localizedSnapshot.settings.themeMode);
      setNotificationGranted(localizedSnapshot.notificationGranted);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap(): Promise<void> {
      await initializeDatabase();
      await configureNotificationHandling(defaultSettings);
      const snapshot = await loadCoreAppData();
      if (!mounted) {
        return;
      }

      await setAppLanguage(snapshot.settings.language);
      await syncLocalizedDefaultLists();
      const [localizedSnapshot, initialTaskCompletionHistory] = await Promise.all([
        loadCoreAppData(),
        fetchTaskCompletionHistory()
      ]);
      await configureNotificationHandling(localizedSnapshot.settings);
      setLists(localizedSnapshot.lists);
      setTasks(localizedSnapshot.tasks);
      setTaskCompletionHistory(initialTaskCompletionHistory);
      setSettings(localizedSnapshot.settings);
      setThemeMode(localizedSnapshot.settings.themeMode);
      setNotificationGranted(localizedSnapshot.notificationGranted);
      await restoreAllTaskSchedules(localizedSnapshot.settings);
      await refresh();
      if (mounted) {
        setReady(true);
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const snapshot = buildWidgetSnapshot({
      tasks,
      lists,
      settings
    });

    void writeWidgetSnapshot(serializeWidgetSnapshot(snapshot))
      .then(reloadWidgets)
      .catch((error) => {
        console.error('Failed to sync DoneYet widget snapshot.', error);
      });
  }, [lists, ready, settings, tasks]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }

      void syncForegroundAppState(settings, {
        configureNotificationHandling,
        getNotificationPermissions,
        restoreAllTaskSchedules,
        setAppLanguage,
        setNotificationGranted
      });
    });

    return () => subscription.remove();
  }, [ready, settings]);

  const palette = useMemo(() => resolvePalette(themeMode, systemScheme), [themeMode, systemScheme]);
  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const showSuccessToast = useCallback((message: string) => {
    setToast({
      id: nextToastIdRef.current++,
      message
    });
  }, []);

  const isPending = useCallback((key: string) => Boolean(pendingCounts[key]), [pendingCounts]);
  const isTaskMutating = useCallback((taskId: string) => isPending(getTaskPendingKey(taskId)), [isPending]);
  const isListMutating = useCallback((listId: string) => isPending(getListPendingKey(listId)), [isPending]);
  const isReorderingTasks = useCallback((listId: string) => isPending(getReorderTasksPendingKey(listId)), [isPending]);
  const isSettingsMutating = isPending(SETTINGS_PENDING_KEY);
  const isCreatingTask = isPending(CREATE_TASK_PENDING_KEY);
  const isCreatingList = isPending(CREATE_LIST_PENDING_KEY);
  const isReorderingLists = isPending(REORDER_LISTS_PENDING_KEY);
  const isImportingBackup = isPending(IMPORT_BACKUP_PENDING_KEY);
  const isRequestingNotificationPermission = isPending(REQUEST_PERMISSION_PENDING_KEY);
  const runTrackedMutation = useMemo(() => createSingleFlightTrackedMutationRunner(setPendingCounts), []);

  const createTask = useCallback(
    async (values: TaskFormValues) => {
      return runTrackedMutation({
        keys: [CREATE_TASK_PENDING_KEY],
        singleFlightKey: CREATE_TASK_PENDING_KEY,
        execute: async () => {
          const created = await createTaskRecord(values, settings);
          await refresh();
          return created;
        },
        getSuccessMessage: () => String(i18n.t('feedback.created')),
        showSuccessToast
      });
    },
    [refresh, settings, showSuccessToast]
  );

  const updateTask = useCallback(
    async (taskId: string, values: TaskFormValues) => {
      return runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:update`,
        execute: async () => {
          const updated = await updateTaskRecord(taskId, values, settings);
          await refresh();
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.updated')) : null),
        showSuccessToast
      });
    },
    [refresh, settings, showSuccessToast]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      return runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:complete`,
        execute: async () => {
          const updated = await completeTaskRecord(taskId, settings);
          await refresh();
          if (updated?.taskMode === 'recurring') {
            await refreshTaskCompletionHistory();
          }
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.completed')) : null),
        showSuccessToast
      });
    },
    [refresh, refreshTaskCompletionHistory, settings, showSuccessToast]
  );

  const pauseTask = useCallback(
    async (taskId: string) => {
      return runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:pause`,
        execute: async () => {
          const updated = await pauseTaskRecord(taskId);
          await refresh();
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.paused')) : null),
        showSuccessToast
      });
    },
    [refresh, showSuccessToast]
  );

  const completeTaskPermanently = useCallback(
    async (taskId: string) => {
      return runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:complete-permanently`,
        execute: async () => {
          const updated = await completeTaskPermanentlyRecord(taskId);
          await refresh();
          if (updated?.taskMode === 'recurring') {
            await refreshTaskCompletionHistory();
          }
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.completed')) : null),
        showSuccessToast
      });
    },
    [refresh, refreshTaskCompletionHistory, showSuccessToast]
  );

  const resumeTask = useCallback(
    async (taskId: string) => {
      return runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:resume`,
        execute: async () => {
          const updated = await resumeTaskRecord(taskId, settings);
          await refresh();
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.resumed')) : null),
        showSuccessToast
      });
    },
    [refresh, settings, showSuccessToast]
  );

  const snoozeTask = useCallback(
    async (taskId: string, snoozedUntil: Date) => {
      return runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:snooze`,
        execute: async () => {
          const updated = await snoozeTaskRecord(taskId, snoozedUntil, settings);
          await refresh();
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.snoozed')) : null),
        showSuccessToast
      });
    },
    [refresh, settings, showSuccessToast]
  );

  const reactivateTask = useCallback(
    async (taskId: string) => {
      return runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:reactivate`,
        execute: async () => {
          const updated = await reactivateCompletedTask(taskId, settings);
          await refresh();
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.reactivated')) : null),
        showSuccessToast
      });
    },
    [refresh, settings, showSuccessToast]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      await runTrackedMutation({
        keys: [getTaskPendingKey(taskId)],
        singleFlightKey: `${getTaskPendingKey(taskId)}:delete`,
        execute: async () => {
          await removeTaskRecord(taskId);
          await refresh();
          await refreshTaskCompletionHistory();
        },
        getSuccessMessage: () => String(i18n.t('feedback.deleted')),
        showSuccessToast
      });
    },
    [refresh, refreshTaskCompletionHistory, showSuccessToast]
  );

  const createList = useCallback(
    async (name: string, color: string, icon: string) => {
      return runTrackedMutation({
        keys: [CREATE_LIST_PENDING_KEY],
        singleFlightKey: CREATE_LIST_PENDING_KEY,
        execute: async () => {
          const list = await createListRecord(name, color, icon);
          await refresh();
          return list;
        },
        getSuccessMessage: () => String(i18n.t('feedback.created')),
        showSuccessToast
      });
    },
    [refresh, showSuccessToast]
  );

  const updateList = useCallback(
    async (listId: string, updates: Partial<Pick<AppList, 'name' | 'color' | 'icon'>>) => {
      return runTrackedMutation({
        keys: [getListPendingKey(listId)],
        singleFlightKey: `${getListPendingKey(listId)}:update`,
        execute: async () => {
          const updated = await updateListRecord(listId, updates);
          await refresh();
          return updated;
        },
        getSuccessMessage: (updated) => (updated ? String(i18n.t('feedback.updated')) : null),
        showSuccessToast
      });
    },
    [refresh, showSuccessToast]
  );

  const reorderLists = useCallback(
    async (listIdsInOrder: string[]) => {
      await runTrackedMutation({
        keys: [REORDER_LISTS_PENDING_KEY],
        singleFlightKey: REORDER_LISTS_PENDING_KEY,
        execute: async () => {
          await reorderListsRecord(listIdsInOrder);
          await refresh();
        },
        getSuccessMessage: () => String(i18n.t('feedback.reordered')),
        showSuccessToast
      });
    },
    [refresh, showSuccessToast]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      await runTrackedMutation({
        keys: [getListPendingKey(listId)],
        singleFlightKey: `${getListPendingKey(listId)}:delete`,
        execute: async () => {
          await deleteListRecord(listId);
          await refresh();
          await refreshTaskCompletionHistory();
        },
        getSuccessMessage: () => String(i18n.t('feedback.deleted')),
        showSuccessToast
      });
    },
    [refresh, refreshTaskCompletionHistory, showSuccessToast]
  );

  const reorderTasks = useCallback(
    async (listId: string, taskIdsInOrder: string[]) => {
      await runTrackedMutation({
        keys: [getReorderTasksPendingKey(listId)],
        singleFlightKey: getReorderTasksPendingKey(listId),
        execute: async () => {
          await reorderTasksRecord(listId, taskIdsInOrder);
          await refresh();
        },
        getSuccessMessage: () => String(i18n.t('feedback.reordered')),
        showSuccessToast
      });
    },
    [refresh, showSuccessToast]
  );

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      return runTrackedMutationDirect({
        keys: [SETTINGS_PENDING_KEY],
        updatePendingCounts: setPendingCounts,
        execute: async () => {
          const next = await updateSettingsRecord(updates);
          await setAppLanguage(next.language);
          await syncLocalizedDefaultLists();
          await configureNotificationHandling(next);
          await restoreAllTaskSchedules(next);
          await refresh();
          return next;
        },
        getSuccessMessage: () => String(i18n.t('feedback.updated')),
        showSuccessToast
      });
    },
    [refresh, showSuccessToast]
  );

  const importBackup = useCallback(
    async (rawJson: string) => {
      return runTrackedMutation({
        keys: [IMPORT_BACKUP_PENDING_KEY],
        singleFlightKey: 'backup:import',
        execute: async () => {
          const result = await importBackupJson(rawJson);
          if (result.ok) {
            const nextSettings = await getSettings();
            await setAppLanguage(nextSettings.language);
            await syncLocalizedDefaultLists();
            await configureNotificationHandling(nextSettings);
            await restoreAllTaskSchedules(nextSettings);
            await refresh();
            await refreshTaskCompletionHistory();
          }
          return result;
        },
        getSuccessMessage: (result) => (result.ok ? String(i18n.t('feedback.imported')) : null),
        showSuccessToast
      });
    },
    [refresh, refreshTaskCompletionHistory, showSuccessToast]
  );

  const exportBackup = useCallback(async () => {
    const payload = await createBackupPayload();
    return JSON.stringify(payload, null, 2);
  }, []);

  const replaceBackup = useCallback(
    async (rawJson: string, options?: ReplaceBackupOptions) => {
      return runTrackedMutation({
        keys: [IMPORT_BACKUP_PENDING_KEY],
        singleFlightKey: 'backup:replace',
        execute: async () => {
          const result = await replaceBackupJson(rawJson);
          if (result.ok) {
            const nextSettings = await getSettings();
            await setAppLanguage(nextSettings.language);
            await syncLocalizedDefaultLists();
            await configureNotificationHandling(nextSettings);
            await restoreAllTaskSchedules(nextSettings);
            await refresh();
            await refreshTaskCompletionHistory();
          }
          return result;
        },
        getSuccessMessage: (result) =>
          result.ok && !options?.suppressSuccessToast ? String(i18n.t('feedback.imported')) : null,
        showSuccessToast
      });
    },
    [refresh, refreshTaskCompletionHistory, showSuccessToast]
  );

  const requestQuickAddReset = useCallback(() => {
    setQuickAddResetVersion((current) => current + 1);
  }, []);

  const enableDebugScreenshotMode = useCallback(() => {
    if (__DEV__) {
      setDebugScreenshotMode(true);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    await runTrackedMutation({
      keys: [REQUEST_PERMISSION_PENDING_KEY],
      singleFlightKey: REQUEST_PERMISSION_PENDING_KEY,
      execute: async () => {
        const permissions = await ensureNotificationPermissions();
        if (permissions.granted) {
          await setAppLanguage(settings.language);
          await syncLocalizedDefaultLists();
          await configureNotificationHandling(settings);
          await restoreAllTaskSchedules(settings);
        }
        await refresh();
        return permissions;
      },
      getSuccessMessage: (permissions) => (permissions.granted ? String(i18n.t('feedback.permissionGranted')) : null),
      showSuccessToast
    });
  }, [refresh, settings, showSuccessToast]);

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const taskId = String(response.notification.request.content.data?.taskId ?? '');
      if (!taskId) {
        return;
      }

      const actionIdentifier = response.actionIdentifier;
      const isCustomNotificationAction = isNotificationActionIdentifier(actionIdentifier);

      if (isCustomNotificationAction && Platform.OS === 'ios') {
        await refresh();
        await refreshTaskCompletionHistory();
        return;
      }

      const scheduledFor = getNotificationResponseScheduledFor(response);
      if (scheduledFor) {
        await recordTaskReminderDelivery(taskId, scheduledFor);
      }

      if (!isCustomNotificationAction) {
        await refresh();
        router.push(`/tasks/${taskId}`);
        return;
      }

      let updatedTask: Task | null = null;
      if (actionIdentifier === 'mark_done') {
        updatedTask = await completeTaskRecord(taskId, settings);
      } else if (actionIdentifier === 'mark_done_forever') {
        updatedTask = await completeTaskPermanentlyRecord(taskId);
      } else if (actionIdentifier === 'snooze_10_min' || actionIdentifier === 'snooze_1_hour' || actionIdentifier === 'snooze_evening' || actionIdentifier === 'snooze_tomorrow') {
        const task = tasks.find((item) => item.id === taskId) ?? (await getTask(taskId));
        if (actionIdentifier === 'snooze_tomorrow' && !task) {
          return;
        }

        const snoozedUntil = resolveSnoozeTime(actionIdentifier as NotificationAction, new Date(), task, scheduledFor);
        updatedTask = await snoozeTaskRecord(taskId, snoozedUntil, settings);
      }

      await refresh();
      if (updatedTask?.taskMode === 'recurring') {
        await refreshTaskCompletionHistory();
      }
    },
    [refresh, refreshTaskCompletionHistory, router, settings, tasks]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      loading,
      lists,
      tasks,
      taskCompletionHistory,
      settings,
      theme: palette,
      themeMode,
      notificationGranted,
      toast,
      debugScreenshotMode,
      quickAddResetVersion,
      dismissToast,
      isTaskMutating,
      isListMutating,
      isSettingsMutating,
      isCreatingTask,
      isCreatingList,
      isReorderingLists,
      isReorderingTasks,
      isImportingBackup,
      isRequestingNotificationPermission,
      refresh,
      createTask,
      updateTask,
      completeTask,
      completeTaskPermanently,
      pauseTask,
      resumeTask,
      snoozeTask,
      reactivateTask,
      removeTask,
      createList,
      updateList,
      reorderLists,
      deleteList,
      reorderTasks,
      updateSettings,
      importBackup,
      replaceBackup,
      exportBackup,
      enableDebugScreenshotMode,
      requestQuickAddReset,
      requestNotificationPermission,
      handleNotificationResponse
    }),
    [
      ready,
      loading,
      lists,
      tasks,
      taskCompletionHistory,
      settings,
      palette,
      themeMode,
      notificationGranted,
      toast,
      debugScreenshotMode,
      quickAddResetVersion,
      dismissToast,
      isTaskMutating,
      isListMutating,
      isSettingsMutating,
      isCreatingTask,
      isCreatingList,
      isReorderingLists,
      isReorderingTasks,
      isImportingBackup,
      isRequestingNotificationPermission,
      refresh,
      createTask,
      updateTask,
      completeTask,
      completeTaskPermanently,
      pauseTask,
      resumeTask,
      snoozeTask,
      reactivateTask,
      removeTask,
      createList,
      updateList,
      reorderLists,
      deleteList,
      reorderTasks,
      updateSettings,
      importBackup,
      replaceBackup,
      exportBackup,
      enableDebugScreenshotMode,
      requestQuickAddReset,
      requestNotificationPermission,
      handleNotificationResponse
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp must be used inside AppProvider');
  }

  return value;
}

export function NotificationBridge() {
  const { handleNotificationResponse } = useApp();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (lastResponse) {
      void handleNotificationResponseOnce(lastResponse, handledResponseKeysRef.current, handleNotificationResponse);
    }
  }, [handleNotificationResponse, lastResponse]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponseOnce(response, handledResponseKeysRef.current, handleNotificationResponse);
    });

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  return null;
}
