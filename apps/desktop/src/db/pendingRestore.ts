/*
 * Applies a staged restore at the start of the app, before the database opens.
 * Ports make the sequence testable without Tauri or PGlite.
 *
 * The chosen backup was validated when it was staged, but is validated again
 * here: a failure before the store is touched drops the staged file and leaves
 * the current database as it was. Once the store is emptied the staged file
 * stays until the load has succeeded, so a crash in between retries the next
 * start instead of losing the data (the current state was backed up first).
 */
export interface PendingRestorePorts {
    readStaged: () => Promise<Blob | null>,
    clearStaged: () => Promise<void>,
    validate: (dump: Blob) => Promise<void>,
    /** Empties the store and loads the dump into it. */
    replace: (dump: Blob) => Promise<void>,
    reportError: (message: string, error: unknown) => void,
}

export type PendingRestoreResult = 'none' | 'restored' | 'discarded';

export const applyPendingRestore = async (ports: PendingRestorePorts): Promise<PendingRestoreResult> => {
    const staged = await ports.readStaged();

    if (!staged) {
        return 'none';
    }

    try {
        await ports.validate(staged);
    } catch (error) {
        ports.reportError('The staged backup cannot be restored; keeping the current database', error);
        await ports.clearStaged();

        return 'discarded';
    }

    try {
        await ports.replace(staged);
    } catch (error) {
        ports.reportError('Restoring the backup failed; it will be retried at the next start', error);

        throw error;
    }

    await ports.clearStaged();

    return 'restored';
};
