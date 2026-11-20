import type {StartFailureInfo, StartFailureKind} from '@stagistic/shared';
import {Button} from '@stagistic/ui';
import type {ReactNode} from 'react';

import {reloadPage} from '../shared/reloadPage';
import styles from './BootFailureScreen.module.css';

interface BootFailureCopy {
    title: string,
    body: string,
    canReload: boolean,
}

/*
 * One entry per failure kind. Copy for `older-version-running` must stress that
 * an older version is running; it must never suggest Stagistic works in one tab only.
 */
const COPY: Record<StartFailureKind, BootFailureCopy> = {
    'older-version-running': {
        title: 'An older version of Stagistic is running',
        body: 'Another tab or window is running an older version of Stagistic and still holds your scripts. '
            + 'Close it, or reload it to update. This Release starts as soon as it lets go. '
            + 'Tabs of this Release can stay open.',
        canReload: false,
    },
    'database-newer-than-app': {
        title: 'Your scripts need a newer Release of Stagistic',
        body: 'Your scripts were last opened by a newer Release than the one loaded here. '
            + 'Reload to get the current Release. Nothing has been changed.',
        canReload: true,
    },
    'migration-failed': {
        title: 'Stagistic could not update your database',
        body: 'Updating your local database failed. Your scripts are still stored on this device. '
            + 'Reloading may help; if it keeps failing, the details below show where it stopped.',
        canReload: true,
    },
    unknown: {
        title: 'Stagistic could not start',
        body: 'Something went wrong while starting the local database. Reload to try again.',
        canReload: true,
    },
};

interface BootFailureScreenProps {
    failure: StartFailureInfo,
    /** Extra actions below the built-in ones, e.g. downloading a backup after a failed migration. */
    actions?: ReactNode,
    onReload?: () => void,
}

export const BootFailureScreen = ({
    failure,
    actions,
    onReload = reloadPage,
}: BootFailureScreenProps) => {
    const copy = COPY[failure.kind];
    const detail = failure.message.trim();

    return (
        <div className={styles.screen} role="alert">
            <div className={styles.card}>
                <p className={styles.wordmark}>Stagistic Editor</p>
                <h1 className={styles.title}>{copy.title}</h1>
                <p className={styles.body}>{copy.body}</p>
                {(copy.canReload || actions) && (
                    <div className={styles.actions}>
                        {copy.canReload && <Button onPress={onReload}>Reload</Button>}
                        {actions}
                    </div>
                )}
                {detail && (
                    <details className={styles.details}>
                        <summary>Technical details</summary>
                        <pre className={styles.detailText}>{detail}</pre>
                    </details>
                )}
            </div>
        </div>
    );
};
