/**
 * Runs `task` once at a time: a call during a run returns that run and
 * schedules exactly one more after it (so nothing requested mid-run is missed).
 * `soon()` coalesces bursts of requests into one run after `delayMs`.
 */
export const createSingleFlight = (task: () => Promise<void>, delayMs = 500) => {
    let current: Promise<void> | null = null;
    let again = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = (): Promise<void> => {
        if (current) {
            again = true;

            return current;
        }

        current = task().finally(() => {
            current = null;

            if (again) {
                again = false;
                void run();
            }
        });

        return current;
    };

    return {
        run,
        soon: () => {
            timer ??= setTimeout(() => {
                timer = null;
                void run();
            }, delayMs);
        },
        cancel: () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        },
    };
};

/**
 * Scripts changed on this device outside a live connection (repository
 * mutations): flushed together once edits pause for `delayMs`.
 */
export const createDirtyQueue = (flush: (scriptIds: string[]) => void, delayMs = 1_000) => {
    const dirty = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        dirty,
        add: (scriptId: string) => {
            dirty.add(scriptId);

            if (timer) {
                clearTimeout(timer);
            }

            timer = setTimeout(() => {
                timer = null;
                flush([...dirty]);
            }, delayMs);
        },
    };
};
