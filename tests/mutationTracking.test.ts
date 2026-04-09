import { describe, expect, it, vi } from 'vitest';
import { createSingleFlightTrackedMutationRunner, runTrackedMutation, updatePendingCounts } from '../context/mutationTracking';

describe('mutation tracking', () => {
  it('tracks pending state and emits the success message on success', async () => {
    let pending: Record<string, number> = {};
    const snapshots: Array<Record<string, number>> = [];
    const showSuccessToast = vi.fn();

    const result = await runTrackedMutation({
      keys: ['task:1'],
      execute: vi.fn().mockResolvedValue({ ok: true }),
      updatePendingCounts: (updater) => {
        pending = updater(pending);
        snapshots.push({ ...pending });
      },
      getSuccessMessage: () => 'Updated.',
      showSuccessToast
    });

    expect(result).toEqual({ ok: true });
    expect(snapshots).toEqual([{ 'task:1': 1 }, {}]);
    expect(showSuccessToast).toHaveBeenCalledWith('Updated.');
  });

  it('clears pending state and skips the success toast when the mutation fails', async () => {
    let pending: Record<string, number> = {};
    const snapshots: Array<Record<string, number>> = [];
    const showSuccessToast = vi.fn();
    const error = new Error('boom');

    await expect(
      runTrackedMutation({
        keys: ['task:1'],
        execute: vi.fn().mockRejectedValue(error),
        updatePendingCounts: (updater) => {
          pending = updater(pending);
          snapshots.push({ ...pending });
        },
        getSuccessMessage: () => 'Updated.',
        showSuccessToast
      })
    ).rejects.toThrow('boom');

    expect(snapshots).toEqual([{ 'task:1': 1 }, {}]);
    expect(showSuccessToast).not.toHaveBeenCalled();
  });

  it('only emits the permission success toast when the result is granted', async () => {
    const showSuccessToast = vi.fn();

    await runTrackedMutation<{ granted: boolean }>({
      keys: ['notifications:permission'],
      execute: vi.fn().mockResolvedValue({ granted: false }),
      updatePendingCounts: () => {},
      getSuccessMessage: (permissions) => (permissions.granted ? 'Permission enabled.' : null),
      showSuccessToast
    });

    await runTrackedMutation<{ granted: boolean }>({
      keys: ['notifications:permission'],
      execute: vi.fn().mockResolvedValue({ granted: true }),
      updatePendingCounts: () => {},
      getSuccessMessage: (permissions) => (permissions.granted ? 'Permission enabled.' : null),
      showSuccessToast
    });

    expect(showSuccessToast).toHaveBeenCalledTimes(1);
    expect(showSuccessToast).toHaveBeenCalledWith('Permission enabled.');
  });

  it('increments and decrements pending counts without leaving zero-value keys behind', () => {
    const incremented = updatePendingCounts({}, ['task:1', 'task:2'], 1);
    const decremented = updatePendingCounts(incremented, ['task:1'], -1);

    expect(incremented).toEqual({ 'task:1': 1, 'task:2': 1 });
    expect(decremented).toEqual({ 'task:2': 1 });
  });

  it('reuses the in-flight mutation for duplicate calls with the same key', async () => {
    let pending: Record<string, number> = {};
    const snapshots: Array<Record<string, number>> = [];
    let resolveMutation!: (value: { ok: true }) => void;
    const execute = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveMutation = resolve;
        })
    );

    const runSingleFlightMutation = createSingleFlightTrackedMutationRunner((updater) => {
      pending = updater(pending);
      snapshots.push({ ...pending });
    });

    const first = runSingleFlightMutation({
      keys: ['task:1'],
      execute
    });
    const second = runSingleFlightMutation({
      keys: ['task:1'],
      execute
    });

    expect(first).toBe(second);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(snapshots).toEqual([{ 'task:1': 1 }]);

    resolveMutation({ ok: true });

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
    expect(snapshots).toEqual([{ 'task:1': 1 }, {}]);
  });

  it('does not merge different mutation types that share the same pending key', async () => {
    let pending: Record<string, number> = {};
    const snapshots: Array<Record<string, number>> = [];
    const executePause = vi.fn().mockResolvedValue({ action: 'pause' });
    const executeDelete = vi.fn().mockResolvedValue({ action: 'delete' });
    const runSingleFlightMutation = createSingleFlightTrackedMutationRunner((updater) => {
      pending = updater(pending);
      snapshots.push({ ...pending });
    });

    const paused = await runSingleFlightMutation({
      keys: ['task:1'],
      singleFlightKey: 'task:1:pause',
      execute: executePause
    });
    const deleted = await runSingleFlightMutation({
      keys: ['task:1'],
      singleFlightKey: 'task:1:delete',
      execute: executeDelete
    });

    expect(paused).toEqual({ action: 'pause' });
    expect(deleted).toEqual({ action: 'delete' });
    expect(executePause).toHaveBeenCalledTimes(1);
    expect(executeDelete).toHaveBeenCalledTimes(1);
    expect(snapshots).toEqual([{ 'task:1': 1 }, {}, { 'task:1': 1 }, {}]);
  });

  it('cleans up rejected single-flight mutations without leaking an unhandled rejection', async () => {
    let pending: Record<string, number> = {};
    const snapshots: Array<Record<string, number>> = [];
    const error = new Error('boom');
    const execute = vi.fn().mockRejectedValue(error);
    const runSingleFlightMutation = createSingleFlightTrackedMutationRunner((updater) => {
      pending = updater(pending);
      snapshots.push({ ...pending });
    });
    const unhandledRejection = vi.fn();
    const handleUnhandledRejection = (reason: unknown) => {
      unhandledRejection(reason);
    };

    process.once('unhandledRejection', handleUnhandledRejection);

    try {
      const first = runSingleFlightMutation({
        keys: ['task:1'],
        execute
      });
      const second = runSingleFlightMutation({
        keys: ['task:1'],
        execute
      });

      expect(first).toBe(second);

      await expect(first).rejects.toThrow('boom');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(execute).toHaveBeenCalledTimes(1);
      expect(snapshots).toEqual([{ 'task:1': 1 }, {}]);
      expect(unhandledRejection).not.toHaveBeenCalled();
    } finally {
      process.removeListener('unhandledRejection', handleUnhandledRejection);
    }
  });
});
