import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationAction, Task, AppSettings } from '@/types/domain';
import { snoozeEveningTime } from '@/constants/settings';
import i18n from '@/i18n';
import { getTomorrowSnoozeDateForTask } from '@/utils/date';

export const TASK_REMINDER_CATEGORY = 'doneyet-task-reminder';
export const TASK_RECURRING_REMINDER_CATEGORY = 'doneyet-task-reminder-recurring';
export const TASK_REMINDER_CHANNEL = 'doneyet-reminders';

let notificationHandlerConfigured = false;
let notificationConfigurationQueue: Promise<void> = Promise.resolve();

type ReminderCategoryAction = {
  identifier: string;
  buttonTitle: string;
  options: {
    opensAppToForeground: boolean;
  };
};

const recurringReminderActionOrder: NotificationAction[] = [
  'mark_done',
  'mark_done_forever',
  'snooze_10_min',
  'snooze_tomorrow'
];

function buildReminderAction(action: NotificationAction): ReminderCategoryAction {
  const opensAppToForeground = Platform.OS !== 'ios';

  switch (action) {
    case 'mark_done':
      return {
        identifier: 'mark_done',
        buttonTitle: String(i18n.t('notifications.actionMarkDone')),
        options: { opensAppToForeground }
      };
    case 'mark_done_forever':
      return {
        identifier: 'mark_done_forever',
        buttonTitle: String(i18n.t('notifications.actionMarkDoneForever')),
        options: { opensAppToForeground }
      };
    case 'snooze_10_min':
      return {
        identifier: 'snooze_10_min',
        buttonTitle: String(i18n.t('notifications.actionSnooze10')),
        options: { opensAppToForeground }
      };
    case 'snooze_1_hour':
      return {
        identifier: 'snooze_1_hour',
        buttonTitle: String(i18n.t('notifications.actionSnooze1h')),
        options: { opensAppToForeground }
      };
    case 'snooze_evening':
      return {
        identifier: 'snooze_evening',
        buttonTitle: String(i18n.t('notifications.actionSnoozeEvening')),
        options: { opensAppToForeground }
      };
    case 'snooze_tomorrow':
      return {
        identifier: 'snooze_tomorrow',
        buttonTitle: String(i18n.t('notifications.actionSnoozeTomorrow')),
        options: { opensAppToForeground }
      };
  }
}

function buildReminderActions(includeFinishAction: boolean): ReminderCategoryAction[] {
  if (includeFinishAction) {
    return recurringReminderActionOrder.map(buildReminderAction);
  }

  return [
    buildReminderAction('mark_done'),
    buildReminderAction('snooze_10_min'),
    buildReminderAction('snooze_1_hour'),
    buildReminderAction('snooze_evening'),
    buildReminderAction('snooze_tomorrow')
  ];
}

async function configureAndroidNotificationChannel(settings?: Pick<AppSettings, 'soundEnabled' | 'vibrationEnabled'>): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL, {
      name: String(i18n.t('notifications.channelName')),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: settings?.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      lightColor: '#116466',
      enableVibrate: Boolean(settings?.vibrationEnabled),
      sound: settings?.soundEnabled ? 'default' : undefined
    });
  }
}

async function configureNotificationCategories(): Promise<void> {
  await Promise.all([
    Notifications.setNotificationCategoryAsync(TASK_REMINDER_CATEGORY, buildReminderActions(false)),
    Notifications.setNotificationCategoryAsync(TASK_RECURRING_REMINDER_CATEGORY, buildReminderActions(true))
  ]);
}

export async function configureNotificationHandling(settings?: Pick<AppSettings, 'soundEnabled' | 'vibrationEnabled'>): Promise<void> {
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });

    notificationHandlerConfigured = true;
  }

  const configure = async () => {
    await configureAndroidNotificationChannel(settings);
    await configureNotificationCategories();
  };

  notificationConfigurationQueue = notificationConfigurationQueue.then(configure, configure);
  return notificationConfigurationQueue;
}

export async function getNotificationPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
  return Notifications.getPermissionsAsync();
}

export async function hasNotificationPermission(): Promise<boolean> {
  const permissions = await getNotificationPermissions();
  return permissions.granted;
}

export async function ensureNotificationPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return current;
  }

  if (!current.canAskAgain) {
    return current;
  }

  return Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true
    }
  });
}

function getTaskReminderBody(task: Task): string {
  return String(i18n.t('notifications.body', { title: task.title.trim() }));
}

function getTaskReminderCategory(task: Task): string {
  return task.taskMode === 'recurring' ? TASK_RECURRING_REMINDER_CATEGORY : TASK_REMINDER_CATEGORY;
}

export async function scheduleTaskReminder(task: Task, fireAt: Date, soundEnabled = true): Promise<string> {
  const trigger: Notifications.DateTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: fireAt,
    ...(Platform.OS === 'android' ? { channelId: TASK_REMINDER_CHANNEL } : {})
  };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: String(i18n.t('notifications.title')),
      body: getTaskReminderBody(task),
      categoryIdentifier: getTaskReminderCategory(task),
      sound: soundEnabled ? 'default' : undefined,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        scheduledFor: fireAt.toISOString()
      }
    },
    trigger
  });
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Notification may already be delivered or removed.
  }
}

export async function cancelNotifications(notificationIds: string[]): Promise<void> {
  await Promise.all(notificationIds.map((id) => cancelNotification(id)));
}

function getValidDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveRelativeSnoozeBase(now: Date, task?: Task | null, explicitBase?: Date | null): Date {
  if (explicitBase && !Number.isNaN(explicitBase.getTime())) {
    return explicitBase;
  }

  return getValidDate(task?.snoozedUntil) ?? getValidDate(task?.nextNotificationAt) ?? getValidDate(task?.startDateTime) ?? now;
}

function addRelativeSnooze(base: Date, now: Date, amountMs: number): Date {
  const candidate = new Date(base.getTime() + amountMs);
  return candidate.getTime() > now.getTime() ? candidate : new Date(now.getTime() + amountMs);
}

export function resolveSnoozeTime(action: NotificationAction, now = new Date(), task?: Task | null, explicitBase?: Date | null): Date {
  const next = new Date(now);

  switch (action) {
    case 'snooze_10_min':
      return addRelativeSnooze(resolveRelativeSnoozeBase(now, task, explicitBase), now, 10 * 60_000);
    case 'snooze_1_hour':
      return addRelativeSnooze(resolveRelativeSnoozeBase(now, task, explicitBase), now, 60 * 60_000);
    case 'snooze_evening': {
      const [hour, minute] = snoozeEveningTime.split(':').map(Number);
      next.setHours(hour, minute, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    case 'snooze_tomorrow':
      if (task) {
        return getTomorrowSnoozeDateForTask(task, now);
      }
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      return next;
    case 'mark_done_forever':
    case 'mark_done':
    default:
      return now;
  }
}
