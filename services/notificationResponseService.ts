import type * as Notifications from 'expo-notifications';

type NotificationResponseLike = Pick<Notifications.NotificationResponse, 'actionIdentifier' | 'notification'>;

export function getNotificationResponseKey(response: NotificationResponseLike): string {
  return `${String(response.notification.request.identifier)}::${String(response.actionIdentifier ?? '')}`;
}

export function getNotificationResponseScheduledFor(response: NotificationResponseLike): Date | null {
  const scheduledFor = response.notification.request.content.data?.scheduledFor;
  if (typeof scheduledFor !== 'string') {
    return null;
  }

  const date = new Date(scheduledFor);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function handleNotificationResponseOnce<T extends NotificationResponseLike>(
  response: T,
  handledKeys: Set<string>,
  handler: (response: T) => Promise<void>
): Promise<boolean> {
  const key = getNotificationResponseKey(response);
  if (handledKeys.has(key)) {
    return false;
  }

  handledKeys.add(key);

  try {
    await handler(response);
    return true;
  } catch (error) {
    handledKeys.delete(key);
    throw error;
  }
}
