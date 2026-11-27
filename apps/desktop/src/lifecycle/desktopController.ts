/*
 * Desktop lifecycle controller. Everything platform-specific arrives through
 * ports, so the sequences are tested with fakes. Safe shutdown lives here;
 * update checks and the manual update notice join this module later and reuse
 * `runShutdown` (restart-to-update is `requestRestart`).
 */

/** `failed`: a save did not reach the database. `saved` includes "nothing to save". */
export type SettleResult = 'saved' | 'failed';

export interface DesktopControllerPorts {
    /** Resolves once every owner of unsaved work has written it, or reports that one failed. */
    settleUnsavedWork: () => Promise<SettleResult>,
    /** True while an owner still holds text the database has not received. */
    hasUnsavedWork: () => boolean,
    /** Persist the live database to disk (syncToFs). Rejects on failure. */
    flush: () => Promise<void>,
    /** Final portable backup. Best effort: its failure never blocks leaving. */
    writeBackup: () => Promise<void>,
    exit: () => Promise<void>,
    relaunch: () => Promise<void>,
    /** Resolves true to leave anyway, false to keep the app open. */
    confirmQuitAnyway: (kind: LeaveKind) => Promise<boolean>,
    setTimer: (callback: () => void, ms: number) => unknown,
    clearTimer: (handle: unknown) => void,
    reportError?: (message: string, error: unknown) => void,
}

export interface DesktopControllerOptions {
    shutdownTimeoutMs?: number,
}

export type ShutdownOutcome = 'completed' | 'timed-out' | 'forced' | 'cancelled' | 'ignored';

export type LeaveKind = 'quit' | 'restart';

export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

export const createDesktopController = (ports: DesktopControllerPorts, options: DesktopControllerOptions = {}) => {
    const timeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    let isShuttingDown = false;

    const leave = (kind: LeaveKind) => (kind === 'restart' ? ports.relaunch() : ports.exit());

    // Settle, flush, back up. Resolves 'failed' when data may not be on disk.
    const saveEverything = async (): Promise<SettleResult> => {
        try {
            if (await ports.settleUnsavedWork() === 'failed') {
                return 'failed';
            }

            await ports.flush();
        } catch (error) {
            ports.reportError?.('Saving before exit failed', error);

            return 'failed';
        }

        try {
            await ports.writeBackup();
        } catch (error) {
            ports.reportError?.('Backup before exit failed', error);
        }

        return 'saved';
    };

    const runShutdown = async (kind: LeaveKind): Promise<ShutdownOutcome> => {
        if (isShuttingDown) {
            return 'ignored';
        }

        isShuttingDown = true;

        try {
            let handle: unknown;
            const timeout = new Promise<'timeout'>(resolve => {
                handle = ports.setTimer(() => resolve('timeout'), timeoutMs);
            });
            const result = await Promise.race([saveEverything(), timeout]);

            ports.clearTimer(handle);

            if (result === 'timeout' && !ports.hasUnsavedWork()) {
                await leave(kind);

                return 'timed-out';
            }

            // A timeout with text still unsaved is a failed save, not a reason to leave silently.
            if (result === 'timeout' || result === 'failed') {
                if (!await ports.confirmQuitAnyway(kind)) {
                    isShuttingDown = false;

                    return 'cancelled';
                }

                await leave(kind);

                return 'forced';
            }

            await leave(kind);

            return 'completed';
        } catch (error) {
            // Exit/relaunch itself failed: allow another attempt.
            isShuttingDown = false;
            ports.reportError?.('Leaving the app failed', error);

            return 'cancelled';
        }
    };

    return {
        requestQuit: () => runShutdown('quit'),
        requestRestart: () => runShutdown('restart'),
        isShuttingDown: () => isShuttingDown,
    };
};

export type DesktopController = ReturnType<typeof createDesktopController>;
