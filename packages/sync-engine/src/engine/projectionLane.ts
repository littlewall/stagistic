/*
 * Debounced projection of one Y.Doc: writes at most every `delayMs` while edits
 * continue, and at least every `maxDelayMs`. Writes of one script run serially
 * (`queue`), so a later write never overtakes an earlier one.
 */

export interface ProjectionLane {
    /** Marks the doc changed and (re)schedules a write. */
    schedule(): void,
    /** Writes now if changed (or `force`); resolves after all queued writes. */
    write(options?: {force?: boolean}): Promise<void>,
    cancel(): void,
}

export interface ProjectionQueue {
    run(task: () => Promise<void>): Promise<void>,
    idle(): Promise<void>,
}

export const createProjectionQueue = (log: (message: string, error?: unknown) => void, label: string): ProjectionQueue => {
    let tail = Promise.resolve();

    return {
        run: task => {
            tail = tail.then(task).catch(error => log(`projection failed for ${label}`, error));

            return tail;
        },
        idle: () => tail,
    };
};

export const createProjectionLane = ({
    queue,
    project,
    delayMs,
    maxDelayMs,
}: {
    queue: ProjectionQueue,
    project: () => Promise<void>,
    delayMs: number,
    maxDelayMs: number,
}): ProjectionLane => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let firstPendingAt: number | null = null;
    let dirty = false;

    const cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        firstPendingAt = null;
    };

    const write: ProjectionLane['write'] = ({force = false} = {}) => {
        cancel();

        if (!dirty && !force) {
            return queue.idle();
        }

        dirty = false;

        return queue.run(project);
    };

    return {
        schedule: () => {
            const now = Date.now();

            dirty = true;
            firstPendingAt ??= now;

            if (timer) {
                clearTimeout(timer);
            }

            const delay = Math.max(0, Math.min(delayMs, firstPendingAt + maxDelayMs - now));

            timer = setTimeout(() => void write(), delay);
        },
        write,
        cancel,
    };
};
