import {useState} from 'react';

import {Button} from '../../atoms/Button/Button';
import {RadioChoiceGroup, type RadioChoiceOption} from '../../atoms/RadioChoiceGroup/RadioChoiceGroup';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import {ModalHeader} from '../modal/ModalHeader';
import styles from './account.module.css';
import {
    type CloudConflictItem,
    type CloudConflictResolution,
    type CloudSyncSummary,
    formatSyncTime,
} from './types';

interface CloudSyncModalProps {
    isOpen: boolean,
    email: string,
    summary: CloudSyncSummary,
    conflicts: CloudConflictItem[],
    /** Stay signed out. */
    onCancel: () => void,
    onSync: (resolutions: Record<string, CloudConflictResolution>) => Promise<void>,
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const describeSummary = ({
    upload,
    download,
    delete: remove,
}: CloudSyncSummary) => {
    const parts = [
        upload > 0 ? `upload ${plural(upload, 'script')}` : null,
        download > 0 ? `download ${plural(download, 'script')}` : null,
        remove > 0 ? `delete ${plural(remove, 'script')}` : null,
    ].filter(Boolean);

    return parts.length > 0 ? `Automatically: ${parts.join(' · ')}.` : null;
};

const optionsFor = (conflict: CloudConflictItem): RadioChoiceOption<CloudConflictResolution>[] => [
    {
        value: 'keep-both',
        label: 'Keep both',
        description: 'The cloud version stays; this one is saved as a copy.',
    },
    {
        value: 'use-newer',
        label: 'Use newer',
        description: conflict.newer === 'cloud'
            ? 'The cloud version is newer: changes from this device are discarded.'
            : 'This version is newer: it replaces the cloud version on all devices.',
    },
];

/** Shown after signing in only when scripts changed both here and in the cloud. */
export const CloudSyncModal = ({
    isOpen,
    email,
    summary,
    conflicts,
    onCancel,
    onSync,
}: CloudSyncModalProps) => {
    const [resolutions, setResolutions] = useState<Record<string, CloudConflictResolution>>(() => Object.fromEntries(conflicts.map(conflict => [conflict.scriptId, 'keep-both' as const])));
    const [isPending, setIsPending] = useState(false);

    const [previousConflicts, setPreviousConflicts] = useState(conflicts);

    if (previousConflicts !== conflicts) {
        setPreviousConflicts(conflicts);
        // Default without loss: keep both.
        setResolutions(Object.fromEntries(conflicts.map(conflict => [conflict.scriptId, 'keep-both' as const])));
    }

    const handleSync = async () => {
        setIsPending(true);

        try {
            await onSync(resolutions);
        } finally {
            setIsPending(false);
        }
    };
    const summaryText = describeSummary(summary);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onCancel}
            ariaLabel="Sync with your account"
        >
            <ModalHeader
                title={`Sync with ${email}`}
                description="These scripts changed on this device and in the cloud. Choose what to keep."
            />
            {summaryText ? <p className={styles.summary}>{summaryText}</p> : null}
            <ul className={styles.conflicts}>
                {conflicts.map(conflict => (
                    <li
                        key={conflict.scriptId}
                        className={styles.conflict}
                    >
                        <h3 className={styles.conflictTitle}>{conflict.title}</h3>
                        <p className={styles.conflictMeta}>
                            {`${plural(conflict.differingScenes, 'scene')} differ · `}
                            {`Here: ${formatSyncTime(conflict.localUpdatedAt)}${conflict.newer === 'local' ? ' (newer)' : ''} · `}
                            {`In the cloud: ${formatSyncTime(conflict.cloudUpdatedAt)}${conflict.newer === 'cloud' ? ' (newer)' : ''}`}
                        </p>
                        <RadioChoiceGroup
                            ariaLabel={`Resolve ${conflict.title}`}
                            value={resolutions[conflict.scriptId] ?? 'keep-both'}
                            options={optionsFor(conflict)}
                            onChange={value => setResolutions(current => ({...current, [conflict.scriptId]: value}))}
                            isDisabled={isPending}
                        />
                    </li>
                ))}
            </ul>
            <ModalActions>
                <Button
                    onPress={() => void handleSync()}
                    isDisabled={isPending}
                >
                    Sync
                </Button>
                <Button
                    variant="ghost"
                    onPress={onCancel}
                    isDisabled={isPending}
                >
                    Cancel
                </Button>
            </ModalActions>
        </ModalDialog>
    );
};
