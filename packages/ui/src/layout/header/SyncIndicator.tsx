import clsx from 'clsx';

import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import styles from '../AppHeader.module.css';
import type {ScriptSyncState} from './types';

type SyncIndicatorProps = {
    state?: ScriptSyncState,
    /** Signed in: the account sync state ("Synced to your account" …); appended to the label. */
    cloudLabel?: string,
};

const syncMetaByState: Record<
    ScriptSyncState,
    {
        label: string,
        className: string,
    }
> = {
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

export const SyncIndicator = ({state = 'idle', cloudLabel}: SyncIndicatorProps) => {
    const syncMeta = syncMetaByState[state];
    const label = [syncMeta.label, cloudLabel].filter(Boolean).join(' · ');
    const isIdle = label.length === 0;

    return (
        <Tooltip
            label={label}
            isDisabled={isIdle}
        >
            <span
                className={clsx(styles.scriptStatus, syncMeta.className)}
                data-sync-status
                data-state={state}
                role={isIdle ? undefined : 'img'}
                aria-label={isIdle ? undefined : label}
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
