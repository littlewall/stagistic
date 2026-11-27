/*
 * Desktop update controller. Checks for a newer Release, downloads and installs
 * it on disk (macOS replaces the app bundle; the running code stays old until
 * relaunch), then waits for the writer to restart. It never restarts by itself.
 * Platform pieces arrive through ports so the sequences are tested with fakes.
 */
import type {ShutdownOutcome} from './desktopController';

export type UpdateState =
    | {status: 'idle'}
    | {status: 'checking'}
    | {status: 'up-to-date', checkedAt: Date}
    | {status: 'downloading', release: string}
    | {status: 'ready', release: string}
    | {status: 'failed'};

export type UpdateCheckResult =
    | {kind: 'up-to-date', checkedAt: Date}
    | {kind: 'ready', release: string}
    | {kind: 'failed'};

export interface AvailableUpdate {
    release: string,
    /** Downloads the Release and installs it on disk. */
    install: () => Promise<void>,
}

export interface UpdateControllerPorts {
    /** Resolves null when this Release is the newest. */
    checkForUpdate: () => Promise<AvailableUpdate | null>,
    isOnline: () => boolean,
    now: () => Date,
    setTimer: (callback: () => void, ms: number) => unknown,
    clearTimer: (handle: unknown) => void,
    reportError?: (message: string, error: unknown) => void,
}

export interface UpdateControllerOptions {
    /** Safe shutdown followed by relaunch. */
    requestRestart: () => Promise<ShutdownOutcome>,
    checkIntervalMs?: number,
    /** Bound for asking whether a newer Release exists. */
    checkTimeoutMs?: number,
    /** Bound for downloading and installing it. */
    installTimeoutMs?: number,
    /** Runs at the start of every update check (same schedule), independent of its outcome. */
    onCheck?: () => void,
}

export const DEFAULT_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_UPDATE_CHECK_TIMEOUT_MS = 30 * 1000;
export const DEFAULT_UPDATE_INSTALL_TIMEOUT_MS = 10 * 60 * 1000;

export const createUpdateController = (ports: UpdateControllerPorts, options: UpdateControllerOptions) => {
    const intervalMs = options.checkIntervalMs ?? DEFAULT_UPDATE_CHECK_INTERVAL_MS;
    const checkTimeoutMs = options.checkTimeoutMs ?? DEFAULT_UPDATE_CHECK_TIMEOUT_MS;
    const installTimeoutMs = options.installTimeoutMs ?? DEFAULT_UPDATE_INSTALL_TIMEOUT_MS;
    const listeners = new Set<() => void>();
    let state: UpdateState = {status: 'idle'};
    let running: Promise<UpdateCheckResult> | null = null;

    const setState = (next: UpdateState) => {
        state = next;
        listeners.forEach(listener => listener());
    };

    const fail = (error: unknown): UpdateCheckResult => {
        ports.reportError?.('Update check failed', error);
        setState({status: 'failed'});

        return {kind: 'failed'};
    };

    // A step that never answers must not keep `running` set forever.
    const within = async <T>(task: Promise<T>, ms: number): Promise<T> => {
        let handle: unknown;
        const timeout = new Promise<never>((_, reject) => {
            handle = ports.setTimer(() => reject(new Error('Update step timed out')), ms);
        });

        try {
            return await Promise.race([task, timeout]);
        } finally {
            ports.clearTimer(handle);
        }
    };

    const run = async (): Promise<UpdateCheckResult> => {
        setState({status: 'checking'});
        options.onCheck?.();

        try {
            const update = await within(ports.checkForUpdate(), checkTimeoutMs);

            if (!update) {
                const checkedAt = ports.now();

                setState({status: 'up-to-date', checkedAt});

                return {kind: 'up-to-date', checkedAt};
            }

            setState({status: 'downloading', release: update.release});
            await within(update.install(), installTimeoutMs);
            setState({status: 'ready', release: update.release});

            return {kind: 'ready', release: update.release};
        } catch (error) {
            return fail(error);
        }
    };

    const checkNow = (): Promise<UpdateCheckResult> => {
        if (state.status === 'ready') {
            return Promise.resolve({kind: 'ready', release: state.release});
        }

        if (!running) {
            const current = run().finally(() => {
                running = null;
            });

            running = current;
        }

        return running;
    };

    const checkInBackground = async (): Promise<void> => {
        if (!ports.isOnline()) {
            return;
        }

        await checkNow();
    };

    const start = () => {
        let timer: unknown;
        let stopped = false;
        const tick = async () => {
            await checkInBackground();

            if (!stopped) {
                timer = ports.setTimer(() => void tick(), intervalMs);
            }
        };

        void tick();

        return () => {
            stopped = true;
            ports.clearTimer(timer);
        };
    };

    return {
        getState: () => state,
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        start,
        checkNow,
        checkInBackground,
        restart: (): Promise<ShutdownOutcome> => (state.status === 'ready' ? options.requestRestart() : Promise.resolve('ignored')),
    };
};

export type UpdateController = ReturnType<typeof createUpdateController>;
