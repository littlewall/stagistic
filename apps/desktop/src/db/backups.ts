import {BaseDirectory, mkdir, readDir, remove, writeFile} from '@tauri-apps/plugin-fs';
import {dumpDataDir} from '~db';

const BACKUP_DIR = 'backups';
const BACKUP_PREFIX = 'stagistic-';
const BACKUP_SUFFIX = '.pgdata.gz';
const MAX_BACKUPS = 5;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

const timestamp = (): string => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` + `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const pruneOldBackups = async (): Promise<void> => {
    const entries = await readDir(BACKUP_DIR, {baseDir: BaseDirectory.AppData});
    const backups = entries
        .filter(entry => entry.isFile && entry.name.startsWith(BACKUP_PREFIX) && entry.name.endsWith(BACKUP_SUFFIX))
        .map(entry => entry.name)
        .sort();

    if (backups.length <= MAX_BACKUPS) {
        return;
    }

    const stale = backups.slice(0, backups.length - MAX_BACKUPS);

    await Promise.all(stale.map(name => remove(`${BACKUP_DIR}/${name}`, {baseDir: BaseDirectory.AppData})));
};

// Snapshot the whole pglite data dir to a single portable file in the app data
// folder. The live store already persists incrementally to OPFS; this is the
// durable, inspectable, exportable copy the user can back up or migrate.
export const writeBackup = async (): Promise<void> => {
    const dump = await dumpDataDir('gzip');
    const bytes = new Uint8Array(await dump.arrayBuffer());

    await mkdir(BACKUP_DIR, {baseDir: BaseDirectory.AppData, recursive: true});
    await writeFile(`${BACKUP_DIR}/${BACKUP_PREFIX}${timestamp()}${BACKUP_SUFFIX}`, bytes, {
        baseDir: BaseDirectory.AppData,
    });
    await pruneOldBackups();
};

export interface BackupSchedule {
    stop: () => void;
}

// Periodic snapshots. Call the returned `stop()` on teardown; pair with a
// window-close handler that awaits `writeBackup()` for a final snapshot.
export const startBackupSchedule = (intervalMs: number = DEFAULT_INTERVAL_MS): BackupSchedule => {
    const runSafely = () => {
        void writeBackup().catch(error => {
            console.error('Backup snapshot failed', error);
        });
    };

    const handle = setInterval(runSafely, intervalMs);

    return {
        stop: () => clearInterval(handle),
    };
};
