import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    loadPgliteFsBundle,
    loadPgliteWasmModule,
    validateDump,
} from '@stagistic/db/pglite';
import {invoke} from '@tauri-apps/api/core';

import {syncToFs} from '../db';
import {writeSafetyBackup} from '../db/backups';
import {
    type BackupSource,
    clearImportedBackup,
    clearStagedRestore,
    readBackupFile,
    stageRestore,
} from '../db/restoreStorage';
import {createRestoreController} from '../lifecycle/restoreController';
import {settleWithin} from '../lifecycle/settleWithin';
import {settleUnsavedWork} from '../lifecycle/tauriPorts';

export const restoreController = createRestoreController<BackupSource>({
    validate: async source => validateDump(await readBackupFile(source), {
        fsBundle: await loadPgliteFsBundle(pgliteDataUrl),
        wasmModule: await loadPgliteWasmModule(pgliteWasmUrl),
    }),
    settleUnsavedWork: () => settleWithin(settleUnsavedWork),
    flush: () => syncToFs(),
    writeSafetyBackup,
    stage: async source => {
        await stageRestore(source);
        await clearImportedBackup().catch(() => undefined);
    },
    unstage: clearStagedRestore,
    relaunch: () => invoke('desktop_relaunch'),
    reportError: (message, error) => {
        console.error(message, error);
    },
});

export interface ImportedBackupFile {
    fileName: string,
    modifiedMs: number | null,
}

/** Opens the Open dialog and copies the picked file into the app data folder; null when cancelled. */
export const importBackupFile = (): Promise<ImportedBackupFile | null> => invoke('desktop_import_backup_file');
