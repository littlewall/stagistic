import {Button} from '@stagistic/ui';
import {useEffect, useState} from 'react';

import {useSaveFile, useSaveWording} from '../shared/saveFile';
import styles from './PremigrationBackupAction.module.css';

export interface PremigrationBackupDownload {
    fileName: string,
    createdAt: number,
    blob: Blob,
}

interface PremigrationBackupActionProps {
    /** Resolves to the stored backup, or null when there is none. */
    loadBackup: () => Promise<PremigrationBackupDownload | null>,
}

const formatTaken = (createdAt: number) => new Date(createdAt).toLocaleString('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const FEEDBACK_URL = 'https://feedback.stagistic.com';

/*
 * Offered next to Reload when an update of the database failed. The file is a
 * dump of the database folder, which Stagistic cannot import today; the copy
 * says so instead of implying a restore button exists. The file format stays
 * out of the writer's sight.
 */
export const PremigrationBackupAction = ({loadBackup}: PremigrationBackupActionProps) => {
    const saveFile = useSaveFile();
    const wording = useSaveWording();
    const [state, setState] = useState<{backup: PremigrationBackupDownload | null} | null>(null);

    useEffect(() => {
        let isActive = true;

        loadBackup().then(
            backup => isActive && setState({backup}),
            () => isActive && setState({backup: null}),
        );

        return () => {
            isActive = false;
        };
    }, [loadBackup]);

    if (!state) {
        return null;
    }

    if (!state.backup) {
        return <p className={styles.note}>No backup copy was stored before this update.</p>;
    }

    const {backup} = state;

    return (
        <>
            <Button onPress={() => void saveFile({data: backup.blob, suggestedName: backup.fileName})}>{wording.backupButton}</Button>
            <p className={styles.note}>
                A copy of your scripts from {formatTaken(backup.createdAt)}, taken before the update.
                Keep the file safe. Stagistic cannot open it yet; if you need it, contact us
                through the <a className={styles.link} href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">feedback link</a>.
            </p>
        </>
    );
};
