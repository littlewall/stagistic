import {
    type MacBackupItem,
    type MacStorageInfo,
    MacStorageSettingsPanel,
} from '@stagistic/app-routes';
import {useToastController} from '@stagistic/ui';
import {appDataDir, join} from '@tauri-apps/api/path';
import {useEffect, useState} from 'react';

import {parseBackups} from '../db/backupFiles';
import {showAttachmentsFolder, showBackupsFolder} from '../db/backupsFolder';
import {listBackupNames} from '../db/backupStorage';
import {clearImportedBackup} from '../db/restoreStorage';
import {importBackupFile, restoreController} from './restoreBackup';

const loadStorageInfo = async (): Promise<MacStorageInfo> => {
    const appData = await appDataDir();

    return {
        attachmentsPath: await join(appData, 'attachments'),
        backupsPath: await join(appData, 'backups'),
    };
};

const loadBackups = async (): Promise<MacBackupItem[]> => {
    try {
        return parseBackups(await listBackupNames());
    } catch {
        // The folder does not exist before the first backup.
        return [];
    }
};

/** The backup time from a standard file name, otherwise the file's modification time. */
const chooseBackupFile = async (onError: () => void): Promise<MacBackupItem | null> => {
    try {
        const imported = await importBackupFile();

        if (!imported) {
            return null;
        }

        const [named] = parseBackups([imported.fileName]);

        return {
            name: imported.fileName,
            kind: 'file',
            fileName: imported.fileName,
            time: named?.time ?? new Date(imported.modifiedMs ?? Date.now()),
        };
    } catch (error) {
        console.error('Could not read the backup file', error);
        onError();

        return null;
    }
};

export const StorageSettings = () => {
    const {addToast} = useToastController();
    const [info, setInfo] = useState<MacStorageInfo | null>(null);
    const [backups, setBackups] = useState<MacBackupItem[] | null>(null);

    useEffect(() => {
        let isActive = true;

        loadStorageInfo().then(
            loaded => isActive && setInfo(loaded),
            error => console.error('Could not read storage locations', error),
        );
        void loadBackups().then(loaded => isActive && setBackups(loaded));

        return () => {
            isActive = false;
        };
    }, []);

    const showFolder = (open: () => Promise<void>, name: string) => () => {
        open().catch((error: unknown) => {
            console.error(`Could not open the ${name} folder`, error);
            addToast({title: `Could not open the ${name} folder`, variant: 'error'});
        });
    };

    return (
        <MacStorageSettingsPanel
            info={info}
            backups={backups}
            onShowAttachmentsFolder={showFolder(showAttachmentsFolder, 'attachments')}
            onShowBackupsFolder={showFolder(showBackupsFolder, 'backups')}
            onRestoreBackup={backup => restoreController.restore(backup.kind === 'file' ? {kind: 'imported'} : {kind: 'backup', name: backup.name})}
            onChooseBackupFile={() => chooseBackupFile(() => addToast({title: 'Could not read the backup file', variant: 'error'}))}
            onDiscardBackupFile={() => void clearImportedBackup().catch(() => undefined)}
        />
    );
};
