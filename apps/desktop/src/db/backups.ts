import {dumpDataDir, readChangeMarker} from '~db';

import {
    listBackupNames,
    removeBackups,
    writeBackupFile,
} from './backupStorage';
import {createBackupWriter} from './backupWriter';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

/*
 * Snapshot the whole pglite data dir to a single portable file in the app data
 * folder. The live store already persists incrementally; this is the durable,
 * inspectable copy the user can back up or restore from Settings ▸ Storage.
 */
const writer = createBackupWriter({
    readMarker: readChangeMarker,
    dump: async () => new Uint8Array(await (await dumpDataDir('gzip')).arrayBuffer()),
    writeFile: writeBackupFile,
    listNames: listBackupNames,
    removeFiles: async names => {
        await removeBackups(names);
    },
    now: () => new Date(),
});

/** Periodic and shutdown backup: written only when script data changed since the last one. */
export const writeBackup = async (): Promise<void> => {
    await writer.writeIfChanged();
};

/** Backup of the current state even when unchanged: the safety copy before a restore. */
export const writeSafetyBackup = async (): Promise<void> => {
    await writer.writeAlways();
};

export interface BackupSchedule {
    stop: () => void,
}

/*
 * Periodic snapshots. Call the returned `stop()` on teardown; the final one is
 * written by the safe-shutdown sequence through `writeBackup()`.
 */
export const startBackupSchedule = (intervalMs: number = DEFAULT_INTERVAL_MS): BackupSchedule => {
    const runSafely = () => {
        void writeBackup().catch(error => {
            console.error('Backup snapshot failed', error);
        });
    };

    void writer.start().catch(error => {
        console.error('Backup baseline failed', error);
    });

    const handle = setInterval(runSafely, intervalMs);

    return {
        stop: () => clearInterval(handle),
    };
};
