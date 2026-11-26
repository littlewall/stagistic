import {
    Button,
    ButtonGroup,
    ConfirmModal,
    PanelHeader,
    SettingsGroup,
} from '@stagistic/ui';
import {useState} from 'react';

import styles from './MacStorageSettingsPanel.module.css';

export interface MacStorageInfo {
    /** Folder holding attachments, from the app data folder. */
    attachmentsPath: string,
    /** Folder holding backup files. */
    backupsPath: string,
}

export interface MacBackupItem {
    /** Identifies the file to the restore action. */
    name: string,
    time: Date,
    /** `premigration`: taken before an update migrated the database; `file`: picked with Restore from File…. */
    kind: 'periodic' | 'premigration' | 'file',
    /** The picked file's name, for `file`. */
    fileName?: string,
}

export type MacRestoreResult = {ok: true} | {ok: false, message: string};

interface MacStorageSettingsPanelProps {
    /** Null while it loads or when it cannot be read. */
    info: MacStorageInfo | null,
    /** Newest first; null while it loads. */
    backups?: MacBackupItem[] | null,
    onShowAttachmentsFolder?: () => void,
    onShowBackupsFolder: () => void,
    /** Restores the whole database from the backup. On success the app relaunches. */
    onRestoreBackup?: (backup: MacBackupItem) => Promise<MacRestoreResult>,
    /** Lets the writer pick a backup file anywhere; null when cancelled. */
    onChooseBackupFile?: () => Promise<MacBackupItem | null>,
    /** Drops a picked file when its confirmation is cancelled. */
    onDiscardBackupFile?: () => void,
}

const formatTime = (time: Date) => time.toLocaleString('en', {dateStyle: 'medium', timeStyle: 'short'});

const backupLabel = (backup: MacBackupItem) => (
    backup.kind === 'premigration' ? `${formatTime(backup.time)} · Before update` : formatTime(backup.time)
);

const confirmTitle = (backup: MacBackupItem) => (
    backup.kind === 'file'
        ? `Restore the backup ${backup.fileName ?? 'file'} from ${formatTime(backup.time)}?`
        : `Restore the backup from ${formatTime(backup.time)}?`
);

/*
 * Storage tab of the Mac app. Where things live on this Mac, the backups
 * newest first with restore, and ways to open the folders in Finder. The Web app has
 * its own Storage tab about browser storage; this one is not shown there.
 */
export const MacStorageSettingsPanel = ({
    info,
    backups = null,
    onShowAttachmentsFolder,
    onShowBackupsFolder,
    onRestoreBackup,
    onChooseBackupFile,
    onDiscardBackupFile,
}: MacStorageSettingsPanelProps) => {
    const [selected, setSelected] = useState<MacBackupItem | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const close = () => {
        if (selected?.kind === 'file') {
            onDiscardBackupFile?.();
        }

        setSelected(null);
        setError(null);
    };

    const chooseFile = async () => {
        const picked = await onChooseBackupFile?.();

        if (picked) {
            setError(null);
            setSelected(picked);
        }
    };

    const confirm = async () => {
        if (!selected || !onRestoreBackup) {
            return;
        }

        setIsPending(true);
        setError(null);

        const result = await onRestoreBackup(selected);

        // On success the app relaunches; the dialog stays pending until it does.
        if (!result.ok) {
            setIsPending(false);
            setError(result.message);
        }
    };

    return (
        <SettingsGroup gap="2xl">
            <PanelHeader
                level={3}
                title="Storage"
                description="Your data is stored locally on this Mac."
            />
            <SettingsGroup gap="lg">
                <PanelHeader
                    level={4}
                    size="section"
                    title="Attachments"
                    description={info ? <code>{info.attachmentsPath}</code> : 'Loading…'}
                />
                {onShowAttachmentsFolder ? (
                    <ButtonGroup>
                        <Button variant="secondary" size="xs" onPress={onShowAttachmentsFolder}>Show Attachments Folder</Button>
                    </ButtonGroup>
                ) : null}
            </SettingsGroup>
            <SettingsGroup gap="lg">
                <PanelHeader
                    level={4}
                    size="section"
                    title="Backups"
                    description={info ? <code>{info.backupsPath}</code> : 'Loading…'}
                />
                {backups && backups.length > 0 ? (
                    <ul aria-label="Backups" className={styles.backups}>
                        {backups.map(backup => (
                            <li key={backup.name} className={styles.backup}>
                                <span>{backupLabel(backup)}</span>
                                {onRestoreBackup ? (
                                    <Button variant="ghost" size="xs" onPress={() => setSelected(backup)}>Restore…</Button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                ) : null}
                {backups && backups.length === 0 ? <p className={styles.empty}>No backup yet.</p> : null}
                <ButtonGroup>
                    <Button variant="secondary" size="xs" onPress={onShowBackupsFolder}>Show Backups Folder</Button>
                    {onChooseBackupFile && onRestoreBackup ? (
                        <Button variant="secondary" size="xs" onPress={() => void chooseFile()}>Restore from File…</Button>
                    ) : null}
                </ButtonGroup>
            </SettingsGroup>
            <ConfirmModal
                isOpen={selected !== null}
                ariaLabel="Restore backup"
                title={selected ? confirmTitle(selected) : 'Restore backup'}
                description="All your scripts are replaced by the ones in this backup."
                changes={[
                    {
                        tone: 'kept',
                        label: 'Saved first',
                        text: 'The current state is backed up before anything changes',
                    },
                    {
                        tone: 'out',
                        label: 'Not restored',
                        text: 'Attachments are not part of backups; ones deleted since then do not come back',
                    },
                ]}
                notes={error ? [error] : undefined}
                confirmLabel="Restore"
                isPending={isPending}
                lockWhilePending
                onClose={close}
                onConfirm={confirm}
            />
        </SettingsGroup>
    );
};
