import { AppList, AppSettings, Task, TaskCompletionHistoryEntry, ThemeMode, TaskFormValues } from '@/types/domain';
import type { NotificationResponse } from 'expo-notifications';

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
  primarySoft: string;
  danger: string;
  warning: string;
  success: string;
  chip: string;
  shadow: string;
}

export interface AppToastState {
  id: number;
  message: string;
}

export interface ReplaceBackupOptions {
  suppressSuccessToast?: boolean;
}

export interface AppContextValue {
  ready: boolean;
  loading: boolean;
  lists: AppList[];
  tasks: Task[];
  taskCompletionHistory: TaskCompletionHistoryEntry[];
  settings: AppSettings;
  theme: ThemePalette;
  themeMode: ThemeMode;
  notificationGranted: boolean;
  toast: AppToastState | null;
  debugScreenshotMode: boolean;
  quickAddResetVersion: number;
  dismissToast: () => void;
  isTaskMutating: (taskId: string) => boolean;
  isListMutating: (listId: string) => boolean;
  isSettingsMutating: boolean;
  isCreatingTask: boolean;
  isCreatingList: boolean;
  isReorderingLists: boolean;
  isReorderingTasks: (listId: string) => boolean;
  isImportingBackup: boolean;
  isRequestingNotificationPermission: boolean;
  refresh: () => Promise<void>;
  createTask: (values: TaskFormValues) => Promise<Task>;
  updateTask: (taskId: string, values: TaskFormValues) => Promise<Task | null>;
  completeTask: (taskId: string) => Promise<Task | null>;
  completeTaskPermanently: (taskId: string) => Promise<Task | null>;
  pauseTask: (taskId: string) => Promise<Task | null>;
  resumeTask: (taskId: string) => Promise<Task | null>;
  snoozeTask: (taskId: string, snoozedUntil: Date) => Promise<Task | null>;
  reactivateTask: (taskId: string) => Promise<Task | null>;
  removeTask: (taskId: string) => Promise<void>;
  createList: (name: string, color: string, icon: string) => Promise<AppList>;
  updateList: (listId: string, updates: Partial<Pick<AppList, 'name' | 'color' | 'icon'>>) => Promise<AppList | null>;
  reorderLists: (listIdsInOrder: string[]) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  reorderTasks: (listId: string, taskIdsInOrder: string[]) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>;
  importBackup: (rawJson: string) => Promise<{ ok: boolean; error?: string }>;
  replaceBackup: (rawJson: string, options?: ReplaceBackupOptions) => Promise<{ ok: boolean; error?: string }>;
  exportBackup: () => Promise<string>;
  enableDebugScreenshotMode: () => void;
  requestQuickAddReset: () => void;
  requestNotificationPermission: () => Promise<void>;
  handleNotificationResponse: (response: NotificationResponse) => Promise<void>;
}
