import {
    BaseDirectory,
    mkdir,
    readDir,
    remove,
    rename,
    writeFile,
} from '@tauri-apps/plugin-fs';

import {
    BACKUP_DIR,
    premigrationBackupName,
    staleBackups,
    temporaryBackupName,
} from './backupFiles';

export const listBackupNames = async (): Promise<string[]> => {
    const entries = await readDir(BACKUP_DIR, {baseDir: BaseDirectory.AppData});

    return entries.filter(entry => entry.isFile).map(entry => entry.name);
};

export const removeBackups = (names: string[]) => Promise.all(
    names.map(name => remove(`${BACKUP_DIR}/${name}`, {baseDir: BaseDirectory.AppData})),
);

/** Written under a temporary name, then renamed: a backup file is never partial. */
export const writeBackupFile = async (name: string, bytes: Uint8Array): Promise<void> => {
    const baseDir = BaseDirectory.AppData;
    const temporary = `${BACKUP_DIR}/${temporaryBackupName(name)}`;

    await mkdir(BACKUP_DIR, {baseDir, recursive: true});
    await writeFile(temporary, bytes, {baseDir});
    await rename(temporary, `${BACKUP_DIR}/${name}`, {oldPathBaseDir: baseDir, newPathBaseDir: baseDir});
};

/*
 * The dump taken before pending migrations run: kept 14 days, and always the newest
 * (see staleBackups).
 */
export const writePremigrationBackup = async (data: ArrayBuffer): Promise<void> => {
    await writeBackupFile(premigrationBackupName(new Date()), new Uint8Array(data));
    await removeBackups(staleBackups(await listBackupNames(), new Date()));
};
