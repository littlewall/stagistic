import clsx from 'clsx';
import {
    Tooltip,
    TooltipTrigger,
} from 'react-aria-components';

import styles from '../AppHeader.module.css';
import type {ScriptSyncState} from './types';

type SyncIndicatorProps = {
    state?: ScriptSyncState,
};

const getSyncMeta = (state: ScriptSyncState) => {
    if (state === 'saving') {
        return {
            label: 'Saving',
            className: styles.scriptStatusSaving,
        };
    }

    if (state === 'error') {
        return {
            label: 'Error',
            className: styles.scriptStatusError,
        };
    }

    return {
        label: 'Saved',
        className: styles.scriptStatusSaved,
    };
};

export const SyncIndicator = ({state = 'saved'}: SyncIndicatorProps) => {
    const syncMeta = getSyncMeta(state);

    return (
        <TooltipTrigger>
            <span
                className={styles.scriptStatus}
                aria-label={syncMeta.label}
                aria-live="polite"
                tabIndex={0}
            >
                <span
                    className={clsx(styles.scriptStatusDot, syncMeta.className)}
                    aria-hidden="true"
                />
            </span>
            <Tooltip className={styles.tooltip}>
                {syncMeta.label}
            </Tooltip>
        </TooltipTrigger>
    );
};
