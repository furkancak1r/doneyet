export type ThemeMode = 'system' | 'light' | 'dark';
export type AppLanguageSetting = 'system' | 'tr' | 'en';

export type TaskStatus = 'active' | 'paused' | 'completed';

export type StartReminderType =
  | 'exact_date_time'
  | 'today_at_time'
  | 'tomorrow_at_time'
  | 'weekly_on_weekday'
  | 'monthly_on_day'
  | 'monthly_on_last_day';

export type RepeatIntervalUnit = 'minutes' | 'hours';
export type RepeatIntervalType = 'preset' | 'custom';
export type TaskMode = 'single' | 'recurring' | 'todo';

export type NotificationAction =
  | 'mark_done'
  | 'snooze_10_min'
  | 'snooze_1_hour'
  | 'snooze_evening'
  | 'snooze_tomorrow';

export interface AppList {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  seedKey?: string | null;
  seedNameLocked?: 0 | 1;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  listId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  startReminderType: StartReminderType;
  startDateTime: string;
  startReminderWeekday: number | null;
  startReminderDayOfMonth: number | null;
  startReminderTime: string;
  startReminderUsesLastDay: 0 | 1;
  taskMode: TaskMode;
  repeatIntervalType: RepeatIntervalType;
  repeatIntervalValue: number;
  repeatIntervalUnit: RepeatIntervalUnit;
  status: TaskStatus;
  lastNotificationAt: string | null;
  nextNotificationAt: string | null;
  snoozedUntil: string | null;
  notificationIdsJson: string;
  completedAt: string | null;
}

export interface AppSettings {
  id: 'singleton';
  defaultStartTime: string;
  soundEnabled: 0 | 1;
  vibrationEnabled: 0 | 1;
  autoHideCompletedTasks: 0 | 1;
  onboardingCompleted: 0 | 1;
  themeMode: ThemeMode;
  language: AppLanguageSetting;
}

export interface TaskNotificationRow {
  id: string;
  taskId: string;
  notificationId: string;
  scheduledFor: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  createdAt: string;
}

export interface TaskFormValues {
  id?: string;
  title: string;
  description: string;
  listId: string;
  startReminderType: StartReminderType;
  startDateTime: Date;
  startReminderWeekday: number | null;
  startReminderDayOfMonth: number | null;
  startReminderTime: string;
  startReminderUsesLastDay: boolean;
  taskMode: TaskMode;
  repeatIntervalType: RepeatIntervalType;
  repeatIntervalValue: number;
  repeatIntervalUnit: RepeatIntervalUnit;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  lists: AppList[];
  tasks: Task[];
  taskNotifications: TaskNotificationRow[];
  settings: AppSettings;
}
