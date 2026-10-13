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
