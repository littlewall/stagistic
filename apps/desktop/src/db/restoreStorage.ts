import {
    BaseDirectory,
    exists,
    mkdir,
    readFile,
    remove,
    rename,
    writeFile,
} from '@tauri-apps/plugin-fs';

import {BACKUP_DIR} from './backupFiles';

/*
 * The chosen backup is copied out of `backups/` before the safety backup is
 * written: writing it prunes that folder and could delete the very file being
 * restored. `pending.pgdata.gz` appears only complete (written under a
 * temporary name, then renamed).
 */
const RESTORE_DIR = 'restore';
const STAGED = `${RESTORE_DIR}/pending.pgdata.gz`;
const STAGING = `${RESTORE_DIR}/pending.tmp`;
const baseDir = BaseDirectory.AppData;

/** A file picked with Restore from File…, copied here by `desktop_import_backup_file`. */
export const IMPORTED_BACKUP = `${RESTORE_DIR}/import.pgdata.gz`;

/** The app data path of a backup: a name in `backups/`, or the imported file. */
export type BackupSource = {kind: 'backup', name: string} | {kind: 'imported'};

const pathOf = (source: BackupSource) => (source.kind === 'imported' ? IMPORTED_BACKUP : `${BACKUP_DIR}/${source.name}`);

export const readBackupFile = async (source: BackupSource): Promise<Blob> => new Blob([await readFile(pathOf(source), {baseDir})]);

export const stageRestore = async (source: BackupSource): Promise<void> => {
    const bytes = await readFile(pathOf(source), {baseDir});

    await mkdir(RESTORE_DIR, {baseDir, recursive: true});
    await writeFile(STAGING, bytes, {baseDir});
    await rename(STAGING, STAGED, {oldPathBaseDir: baseDir, newPathBaseDir: baseDir});
};

export const readStagedRestore = async (): Promise<Blob | null> => {
    if (!await exists(STAGED, {baseDir})) {
        return null;
    }

    return new Blob([await readFile(STAGED, {baseDir})]);
};

export const clearImportedBackup = async (): Promise<void> => {
    if (await exists(IMPORTED_BACKUP, {baseDir})) {
        await remove(IMPORTED_BACKUP, {baseDir});
    }
};

export const clearStagedRestore = async (): Promise<void> => {
    for (const path of [STAGED, STAGING]) {
        if (await exists(path, {baseDir})) {
            await remove(path, {baseDir});
        }
    }
};
