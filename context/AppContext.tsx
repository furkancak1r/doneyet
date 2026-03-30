import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, useColorScheme, type ColorSchemeName } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppContextValue, ThemePalette } from '@/types/app';
import { AppList, AppSettings, NotificationAction, Task, TaskFormValues, ThemeMode } from '@/types/domain';
import { darkColors, lightColors } from '@/constants/theme';
import { defaultSettings } from '@/constants/settings';
import { initializeDatabase } from '@/db/schema';
import { setAppLanguage } from '@/i18n';
import {
  completeTask as completeTaskRecord,
  createTask as createTaskRecord,
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
import { importBackupJson, createBackupPayload } from '@/services/backupService';
import { configureNotificationHandling, ensureNotificationPermissions, getNotificationPermissions, resolveSnoozeTime } from '@/services/notificationService';
import { restoreAllTaskSchedules } from '@/services/schedulerService';

const AppContext = createContext<AppContextValue | null>(null);

function resolvePalette(themeMode: ThemeMode, systemMode: ColorSchemeName): ThemePalette {
  if (themeMode === 'dark' || (themeMode === 'system' && systemMode === 'dark')) {
    return darkColors;
  }

  return lightColors;
}

async function loadAppData(): Promise<{
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
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await loadAppData();
      await setAppLanguage(snapshot.settings.language);
      await syncLocalizedDefaultLists();
      const localizedSnapshot = await loadAppData();
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
      configureNotificationHandling(defaultSettings);
      const snapshot = await loadAppData();
      if (!mounted) {
        return;
      }

      await setAppLanguage(snapshot.settings.language);
      await syncLocalizedDefaultLists();
      const localizedSnapshot = await loadAppData();
      configureNotificationHandling(localizedSnapshot.settings);
      setLists(localizedSnapshot.lists);
      setTasks(localizedSnapshot.tasks);
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
    if (!ready || settings.language !== 'system') {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }

      void (async () => {
        await setAppLanguage('system');
        configureNotificationHandling(settings);
        await restoreAllTaskSchedules(settings);
      })();
    });

    return () => subscription.remove();
  }, [ready, settings]);

  const palette = useMemo(() => resolvePalette(themeMode, systemScheme), [themeMode, systemScheme]);

  const createTask = useCallback(
    async (values: TaskFormValues) => {
      const created = await createTaskRecord(values, settings);
      await refresh();
      return created;
    },
    [refresh, settings]
  );

  const updateTask = useCallback(
    async (taskId: string, values: TaskFormValues) => {
      const updated = await updateTaskRecord(taskId, values, settings);
      await refresh();
      return updated;
    },
    [refresh, settings]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      const updated = await completeTaskRecord(taskId, settings);
      await refresh();
      return updated;
    },
    [refresh, settings]
  );

  const pauseTask = useCallback(
    async (taskId: string) => {
      const updated = await pauseTaskRecord(taskId);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const resumeTask = useCallback(
    async (taskId: string) => {
      const updated = await resumeTaskRecord(taskId, settings);
      await refresh();
      return updated;
    },
    [refresh, settings]
  );

  const snoozeTask = useCallback(
    async (taskId: string, snoozedUntil: Date) => {
      const updated = await snoozeTaskRecord(taskId, snoozedUntil, settings);
      await refresh();
      return updated;
    },
    [refresh, settings]
  );

  const reactivateTask = useCallback(
    async (taskId: string) => {
      const updated = await reactivateCompletedTask(taskId, settings);
      await refresh();
      return updated;
    },
    [refresh, settings]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      await removeTaskRecord(taskId);
      await refresh();
    },
    [refresh]
  );

  const createList = useCallback(
    async (name: string, color: string, icon: string) => {
      const list = await createListRecord(name, color, icon);
      await refresh();
      return list;
    },
    [refresh]
  );

  const updateList = useCallback(
    async (listId: string, updates: Partial<Pick<AppList, 'name' | 'color' | 'icon'>>) => {
      const updated = await updateListRecord(listId, updates);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const reorderLists = useCallback(
    async (listIdsInOrder: string[]) => {
      await reorderListsRecord(listIdsInOrder);
      await refresh();
    },
    [refresh]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      await deleteListRecord(listId);
      await refresh();
    },
    [refresh]
  );

  const reorderTasks = useCallback(
    async (listId: string, taskIdsInOrder: string[]) => {
      await reorderTasksRecord(listId, taskIdsInOrder);
      await refresh();
    },
    [refresh]
  );

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const next = await updateSettingsRecord(updates);
      await setAppLanguage(next.language);
      await syncLocalizedDefaultLists();
      configureNotificationHandling(next);
      await restoreAllTaskSchedules(next);
      await refresh();
      return next;
    },
    [refresh]
  );

  const importBackup = useCallback(
    async (rawJson: string) => {
      const result = await importBackupJson(rawJson);
      if (result.ok) {
        const nextSettings = await getSettings();
        await setAppLanguage(nextSettings.language);
        await syncLocalizedDefaultLists();
        configureNotificationHandling(nextSettings);
        await restoreAllTaskSchedules(nextSettings);
        await refresh();
      }
      return result;
    },
    [refresh]
  );

  const exportBackup = useCallback(async () => {
    const payload = await createBackupPayload();
    return JSON.stringify(payload, null, 2);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const permissions = await ensureNotificationPermissions();
    if (permissions.granted) {
      await setAppLanguage(settings.language);
      await syncLocalizedDefaultLists();
      configureNotificationHandling(settings);
      await restoreAllTaskSchedules(settings);
    }
    await refresh();
  }, [refresh, settings]);

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const taskId = String(response.notification.request.content.data?.taskId ?? '');
      if (!taskId) {
        return;
      }

      const actionIdentifier = response.actionIdentifier;
      if (actionIdentifier === 'mark_done') {
        await completeTask(taskId);
      } else if (actionIdentifier === 'snooze_10_min' || actionIdentifier === 'snooze_1_hour' || actionIdentifier === 'snooze_evening' || actionIdentifier === 'snooze_tomorrow') {
        const snoozedUntil = resolveSnoozeTime(actionIdentifier as NotificationAction, new Date());
        await snoozeTask(taskId, snoozedUntil);
      }

      await refresh();
      router.push(`/tasks/${taskId}`);
    },
    [completeTask, refresh, router, snoozeTask]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      loading,
      lists,
      tasks,
      settings,
      theme: palette,
      themeMode,
      notificationGranted,
      refresh,
      createTask,
      updateTask,
      completeTask,
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
      exportBackup,
      requestNotificationPermission,
      handleNotificationResponse
    }),
    [
      ready,
      loading,
      lists,
      tasks,
      settings,
      palette,
      themeMode,
      notificationGranted,
      refresh,
      createTask,
      updateTask,
      completeTask,
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
      exportBackup,
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
  const handledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastResponse && handledIdRef.current !== lastResponse.notification.request.identifier) {
      handledIdRef.current = lastResponse.notification.request.identifier;
      void handleNotificationResponse(lastResponse);
    }
  }, [handleNotificationResponse, lastResponse]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  return null;
}
