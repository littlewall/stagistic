import clsx from 'clsx';

import {Tooltip} from '../../atoms/Tooltip';
import styles from '../AppHeader.module.css';
import type {ScriptSyncState} from './types';

type SyncIndicatorProps = {
    state?: ScriptSyncState,
};

const syncMetaByState: Record<ScriptSyncState, {
    label: string,
    className: string,
}> = {
    idle: {
        label: '',
        className: styles.idle,
    },
    saving: {
        label: 'Saving…',
        className: styles.saving,
    },
    saved: {
        label: 'Saved',
        className: styles.saved,
    },
    error: {
        label: 'Couldn’t save',
        className: styles.error,
    },
};

export const SyncIndicator = ({state = 'idle'}: SyncIndicatorProps) => {
    const syncMeta = syncMetaByState[state];
    const isIdle = state === 'idle';

    return (
        <Tooltip label={syncMeta.label} isDisabled={isIdle}>
            <span
                className={clsx(styles.scriptStatus, syncMeta.className)}
                data-sync-status
                data-state={state}
                role={isIdle ? undefined : 'img'}
                aria-label={isIdle ? undefined : syncMeta.label}
                aria-live="polite"
                aria-hidden={isIdle || undefined}
                tabIndex={isIdle ? undefined : 0}
            >
                <span
                    className={clsx(styles.dot, syncMeta.className)}
                    aria-hidden="true"
                />
            </span>
        </Tooltip>
    );
};
