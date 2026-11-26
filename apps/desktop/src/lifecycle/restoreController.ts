/*
 * Restore from a backup, as one sequence behind ports (tested with fakes):
 * check the chosen file, save and flush, stage the chosen file, back up the
 * current state, relaunch. The database itself is replaced at the next start
 * (db/pendingRestore.ts). Every step before the relaunch can fail without
 * changing the current database; a failure is reported and returned.
 */
export interface RestorePorts<Source = string> {
    /** Rejects when the file is unreadable or not a database this build can load. */
    validate: (source: Source) => Promise<void>,
    settleUnsavedWork: () => Promise<'saved' | 'failed'>,
    flush: () => Promise<void>,
    /** Backup of the current state, written even when nothing changed. */
    writeSafetyBackup: () => Promise<void>,
    stage: (source: Source) => Promise<void>,
    unstage: () => Promise<void>,
    relaunch: () => Promise<void>,
    reportError: (message: string, error: unknown) => void,
}

export type RestoreResult = {ok: true} | {ok: false, message: string};

const fail = <Source>(ports: RestorePorts<Source>, message: string, error: unknown): RestoreResult => {
    ports.reportError(message, error);

    return {ok: false, message};
};

export const createRestoreController = <Source = string>(ports: RestorePorts<Source>) => {
    let isRunning = false;

    const run = async (backupName: Source): Promise<RestoreResult> => {
        try {
            await ports.validate(backupName);
        } catch (error) {
            return fail(ports, 'This backup cannot be restored. It is unreadable or was made by another version.', error);
        }

        try {
            if (await ports.settleUnsavedWork() === 'failed') {
                return fail(ports, 'Your latest changes could not be saved, so nothing was restored.', new Error('Saving failed'));
            }

            await ports.flush();
        } catch (error) {
            return fail(ports, 'Your latest changes could not be saved, so nothing was restored.', error);
        }

        try {
            await ports.stage(backupName);
        } catch (error) {
            await ports.unstage().catch(() => undefined);

            return fail(ports, 'The backup could not be prepared, so nothing was restored.', error);
        }

        try {
            await ports.writeSafetyBackup();
        } catch (error) {
            await ports.unstage().catch(() => undefined);

            return fail(ports, 'The current state could not be backed up first, so nothing was restored.', error);
        }

        try {
            await ports.relaunch();
        } catch (error) {
            await ports.unstage().catch(() => undefined);

            return fail(ports, 'The app could not restart, so nothing was restored.', error);
        }

        return {ok: true};
    };

    return {
        restore: async (backupName: Source): Promise<RestoreResult> => {
            if (isRunning) {
                return {ok: false, message: 'A restore is already running.'};
            }

            isRunning = true;

            try {
                return await run(backupName);
            } finally {
                isRunning = false;
            }
        },
    };
};

export type RestoreController<Source = string> = ReturnType<typeof createRestoreController<Source>>;
