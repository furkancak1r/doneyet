import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationAction, Task, AppSettings } from '@/types/domain';
import { snoozeEveningTime } from '@/constants/settings';
import i18n from '@/i18n';

export const TASK_REMINDER_CATEGORY = 'doneyet-task-reminder';
export const TASK_REMINDER_CHANNEL = 'doneyet-reminders';

let notificationConfigured = false;

export function configureNotificationHandling(settings?: Pick<AppSettings, 'soundEnabled' | 'vibrationEnabled'>): void {
  if (notificationConfigured) {
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL, {
        name: String(i18n.t('notifications.channelName')),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: settings?.vibrationEnabled ? [0, 250, 250, 250] : undefined,
        lightColor: '#116466',
        enableVibrate: Boolean(settings?.vibrationEnabled),
        sound: settings?.soundEnabled ? 'default' : undefined
      });
    }
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL, {
      name: String(i18n.t('notifications.channelName')),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: settings?.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      lightColor: '#116466',
      enableVibrate: Boolean(settings?.vibrationEnabled),
      sound: settings?.soundEnabled ? 'default' : undefined
    });
  }

  void Notifications.setNotificationCategoryAsync(TASK_REMINDER_CATEGORY, [
    {
      identifier: 'mark_done',
      buttonTitle: String(i18n.t('notifications.actionMarkDone')),
      options: { opensAppToForeground: true }
    },
    {
      identifier: 'snooze_10_min',
      buttonTitle: String(i18n.t('notifications.actionSnooze10')),
      options: { opensAppToForeground: true }
    },
    {
      identifier: 'snooze_1_hour',
      buttonTitle: String(i18n.t('notifications.actionSnooze1h')),
      options: { opensAppToForeground: true }
    },
    {
      identifier: 'snooze_evening',
      buttonTitle: String(i18n.t('notifications.actionSnoozeEvening')),
      options: { opensAppToForeground: true }
    },
    {
      identifier: 'snooze_tomorrow',
      buttonTitle: String(i18n.t('notifications.actionSnoozeTomorrow')),
      options: { opensAppToForeground: true }
    }
  ]);

  notificationConfigured = true;
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
      categoryIdentifier: TASK_REMINDER_CATEGORY,
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

export function resolveSnoozeTime(action: NotificationAction, now = new Date()): Date {
  const next = new Date(now);

  switch (action) {
    case 'snooze_10_min':
      next.setMinutes(next.getMinutes() + 10);
      return next;
    case 'snooze_1_hour':
      next.setHours(next.getHours() + 1);
      return next;
    case 'snooze_evening': {
      const [hour, minute] = snoozeEveningTime.split(':').map(Number);
      next.setHours(hour, minute, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    case 'snooze_tomorrow':
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      return next;
    case 'mark_done':
    default:
      return now;
  }
}
