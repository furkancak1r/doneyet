export type PendingCounts = Record<string, number>;

type PendingCountsUpdater = (updater: (current: PendingCounts) => PendingCounts) => void;

export interface RunTrackedMutationOptions<Result> {
  keys: string[];
  singleFlightKey?: string;
  execute: () => Promise<Result>;
  updatePendingCounts: PendingCountsUpdater;
  getSuccessMessage?: (result: Result) => string | null;
  showSuccessToast?: (message: string) => void;
}

export type SingleFlightTrackedMutationOptions<Result> = Omit<RunTrackedMutationOptions<Result>, 'updatePendingCounts'>;

export function updatePendingCounts(current: PendingCounts, keys: string[], delta: 1 | -1): PendingCounts {
  const next = { ...current };

  for (const key of keys) {
    const previous = next[key] ?? 0;
    const value = previous + delta;

    if (value > 0) {
      next[key] = value;
    } else {
      delete next[key];
    }
  }

  return next;
}

export async function runTrackedMutation<Result>({
  keys,
  execute,
  updatePendingCounts: setPendingCounts,
  getSuccessMessage,
  showSuccessToast
}: RunTrackedMutationOptions<Result>): Promise<Result> {
  setPendingCounts((current) => updatePendingCounts(current, keys, 1));

  try {
    const result = await execute();
    const message = getSuccessMessage?.(result) ?? null;

    if (message) {
      showSuccessToast?.(message);
    }

    return result;
  } finally {
    setPendingCounts((current) => updatePendingCounts(current, keys, -1));
  }
}

export function createSingleFlightTrackedMutationRunner(updatePendingCounts: PendingCountsUpdater) {
  const inFlightByKey = new Map<string, Promise<unknown>>();

  return function runSingleFlightTrackedMutation<Result>({
    keys,
    singleFlightKey,
    execute,
    getSuccessMessage,
    showSuccessToast
  }: SingleFlightTrackedMutationOptions<Result>): Promise<Result> {
    const flightKey = singleFlightKey ?? keys.join('|');
    const existingPromise = inFlightByKey.get(flightKey);

    if (existingPromise) {
      return existingPromise as Promise<Result>;
    }

    const mutationPromise = runTrackedMutation({
      keys,
      execute,
      updatePendingCounts,
      getSuccessMessage,
      showSuccessToast
    });

    inFlightByKey.set(flightKey, mutationPromise);

    mutationPromise.then(
      () => {
        if (inFlightByKey.get(flightKey) === mutationPromise) {
          inFlightByKey.delete(flightKey);
        }
      },
      () => {
        if (inFlightByKey.get(flightKey) === mutationPromise) {
          inFlightByKey.delete(flightKey);
        }
      }
    );

    return mutationPromise;
  };
}
