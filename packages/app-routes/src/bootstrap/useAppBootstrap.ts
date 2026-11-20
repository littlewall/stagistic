import {
    describeStartFailure,
    StartFailureError,
    type StartFailureInfo,
} from '@stagistic/shared';
import {useEffect, useState} from 'react';

interface BootProgress {
    progress: number,
    label: string,
    /**
     * The step may legitimately run long (migrations on a large database), so
     * the stall timer stops until the next update.
     */
    longRunning?: boolean,
    /**
     * The start is held up by something the writer has to resolve and goes on
     * by itself afterwards. Shown like a failure, and the stall timer stops,
     * until an update arrives without it.
     */
    blocked?: StartFailureInfo,
    /**
     * The start waits for the database in another tab or a long migration.
     * After `waitingTimeoutMs` the bootstrap shows an explanatory screen, but
     * the start keeps going and clears it once the database answers.
     */
    waitsForDatabase?: boolean,
}

interface AppBootstrapOptions<Services> {
    beforeDatabase?: () => Promise<void>,
    prepareDatabase: (onProgress: (update: BootProgress) => void) => Promise<void>,
    /** Loads the app's services (repository module) once the database is ready. */
    loadRepository: () => Promise<Services>,
    /** How long the database start may go without a progress update. */
    stallTimeoutMs?: number,
    /** How long a `waitsForDatabase` start may wait before the explanatory screen. */
    waitingTimeoutMs?: number,
    /**
     * How long the start may go without any update, of any kind, before the
     * waiting screen offers a reload. Long steps stay on their own; this only
     * covers a worker that died without a word.
     */
    silenceTimeoutMs?: number,
}

export const DEFAULT_STALL_TIMEOUT_MS = 60_000;
export const DEFAULT_WAITING_TIMEOUT_MS = 60_000;
export const DEFAULT_SILENCE_TIMEOUT_MS = 300_000;

/** Keep options stable so a render does not restart database initialization. */
export const useAppBootstrap = <Services>(options: AppBootstrapOptions<Services>) => {
    const [services, setServices] = useState<Services | null>(null);
    const [bootProgress, setBootProgress] = useState(0);
    const [bootStatus, setBootStatus] = useState('Preparing');
    const [failure, setFailure] = useState<StartFailureInfo | null>(null);
    const [blocked, setBlocked] = useState<StartFailureInfo | null>(null);
    const [waitingNotice, setWaitingNotice] = useState(false);
    const [waitingSilent, setWaitingSilent] = useState(false);

    useEffect(() => {
        let isActive = true;
        let hasFailed = false;
        let stallFailed = false;
        let stallTimer: ReturnType<typeof setTimeout> | undefined;
        let waitingTimer: ReturnType<typeof setTimeout> | undefined;
        let silenceTimer: ReturnType<typeof setTimeout> | undefined;
        let waitingStage: string | null = null;
        const stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT_MS;
        const waitingTimeoutMs = options.waitingTimeoutMs ?? DEFAULT_WAITING_TIMEOUT_MS;
        const silenceTimeoutMs = options.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS;
        const isCurrent = () => isActive && !hasFailed;

        const fail = (error: unknown, isStall = false) => {
            // A real rejection after a stall failure replaces the generic "did not respond".
            if (!isActive || (hasFailed && !stallFailed)) {
                return;
            }

            stallFailed = isStall;
            hasFailed = true;
            console.error('[bootstrap] Start failed.', error);
            setFailure(describeStartFailure(error));
        };

        // A slow first load can trip the stall timer and then keep going: later progress clears it.
        const recoverStallFailure = () => {
            if (!stallFailed) {
                return;
            }

            stallFailed = false;
            hasFailed = false;
            setFailure(null);
        };

        const stopStallTimer = () => {
            clearTimeout(stallTimer);
            stallTimer = undefined;
        };

        // A database that stops reporting (e.g. a worker file that came back as HTML) never settles.
        const restartStallTimer = () => {
            stopStallTimer();
            stallTimer = setTimeout(() => {
                fail(new StartFailureError(
                    'unknown',
                    `The local database did not respond within ${Math.round(stallTimeoutMs / 1000)} seconds.`,
                ), true);
            }, stallTimeoutMs);
        };

        // Nothing at all for a long time: the worker may be gone, so the waiting screen offers a reload.
        const restartSilenceTimer = () => {
            clearTimeout(silenceTimer);
            setWaitingSilent(false);
            silenceTimer = setTimeout(() => {
                if (isCurrent()) {
                    setWaitingSilent(true);
                }
            }, silenceTimeoutMs);
        };

        const stopWaitingTimer = () => {
            clearTimeout(waitingTimer);
            waitingTimer = undefined;
        };

        // A wait that legitimately runs long gets an explanatory screen instead of a silent loader.
        const restartWaitingTimer = () => {
            stopWaitingTimer();
            waitingTimer = setTimeout(() => {
                if (isCurrent()) {
                    setWaitingNotice(true);
                }
            }, waitingTimeoutMs);
        };

        const boot = async () => {
            if (document.fonts) {
                await document.fonts.ready;
            }

            if (!isCurrent()) {
                return;
            }

            if (options.beforeDatabase) {
                await options.beforeDatabase();
            }

            if (!isCurrent()) {
                return;
            }

            restartStallTimer();
            restartSilenceTimer();

            try {
                await options.prepareDatabase(update => {
                    recoverStallFailure();

                    if (!isCurrent()) {
                        return;
                    }

                    setBootProgress(update.progress);
                    setBootStatus(update.label);
                    setBlocked(update.blocked ?? null);
                    restartSilenceTimer();

                    if (update.longRunning || update.blocked) {
                        stopStallTimer();
                    } else {
                        restartStallTimer();
                    }

                    const waitingKey = update.waitsForDatabase && !update.blocked ? update.label : null;

                    if (waitingKey !== waitingStage) {
                        waitingStage = waitingKey;
                        stopWaitingTimer();
                        setWaitingNotice(false);

                        if (waitingKey) {
                            restartWaitingTimer();
                        }
                    }
                });
            } finally {
                stopStallTimer();
                stopWaitingTimer();
                clearTimeout(silenceTimer);
            }

            if (!isCurrent()) {
                return;
            }

            const repository = await options.loadRepository();

            if (isCurrent()) {
                setServices(repository);
            }
        };

        boot().catch(fail);

        return () => {
            isActive = false;
            stopStallTimer();
            stopWaitingTimer();
            clearTimeout(silenceTimer);
        };
    }, [options]);

    return {
        services,
        bootProgress,
        bootStatus,
        failure: failure ?? blocked,
        waitingNotice,
        waitingSilent,
    };
};
