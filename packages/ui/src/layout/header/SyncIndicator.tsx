import clsx from 'clsx';

import {Tooltip} from '../../atoms/Tooltip';
import styles from '../AppHeader.module.css';
import type {ScriptSyncState} from './types';

type SyncIndicatorProps = {
    state?: ScriptSyncState,
};

const getSyncMeta = (state: ScriptSyncState) => {
    if (state === 'saving') {
        return {
            label: 'Saving',
            className: styles.saving,
        };
    }

    if (state === 'error') {
        return {
            label: 'Error',
            className: styles.error,
        };
    }

    return {
        label: 'Saved',
        className: styles.saved,
    };
};

export const SyncIndicator = ({state = 'saved'}: SyncIndicatorProps) => {
    const syncMeta = getSyncMeta(state);

    return (
        <Tooltip label={syncMeta.label}>
            <span
                className={styles.scriptStatus}
                role="img"
                aria-label={syncMeta.label}
                aria-live="polite"
                tabIndex={0}
            >
                <span
                    className={clsx(styles.dot, syncMeta.className)}
                    aria-hidden="true"
                />
            </span>
        </Tooltip>
    );
};
