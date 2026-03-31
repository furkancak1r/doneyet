import { describe, expect, it, vi } from 'vitest';
import { getNotificationResponseKey, handleNotificationResponseOnce } from '../services/notificationResponseService';

function makeResponse(overrides?: Partial<{ actionIdentifier: string; identifier: string }>) {
  return {
    actionIdentifier: overrides?.actionIdentifier ?? 'mark_done',
    notification: {
      request: {
        identifier: overrides?.identifier ?? 'notif-1'
      }
    }
  };
}

describe('notification response service', () => {
  it('builds a dedupe key from the notification identifier and action', () => {
    expect(getNotificationResponseKey(makeResponse({ identifier: 'notif-42', actionIdentifier: 'snooze_10_min' }) as never)).toBe(
      'notif-42::snooze_10_min'
    );
  });

  it('handles the same mark_done response only once across duplicate deliveries', async () => {
    const handledKeys = new Set<string>();
    const completeRecurringTask = vi.fn().mockResolvedValue(undefined);
    const response = makeResponse({ actionIdentifier: 'mark_done', identifier: 'notif-recurring' });

    const firstResult = await handleNotificationResponseOnce(response as never, handledKeys, completeRecurringTask);
    const secondResult = await handleNotificationResponseOnce(response as never, handledKeys, completeRecurringTask);

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(false);
    expect(completeRecurringTask).toHaveBeenCalledTimes(1);
  });

  it('removes the dedupe key when handling fails so a retry can run', async () => {
    const handledKeys = new Set<string>();
    const response = makeResponse({ actionIdentifier: 'snooze_1_hour' });
    const failingHandler = vi.fn().mockRejectedValueOnce(new Error('temporary'));
    const succeedingHandler = vi.fn().mockResolvedValue(undefined);

    await expect(handleNotificationResponseOnce(response as never, handledKeys, failingHandler)).rejects.toThrow('temporary');
    await expect(handleNotificationResponseOnce(response as never, handledKeys, succeedingHandler)).resolves.toBe(true);
    expect(succeedingHandler).toHaveBeenCalledTimes(1);
  });
});
