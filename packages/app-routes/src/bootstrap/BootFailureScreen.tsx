import type {ReleaseNoteSurface} from '@stagistic/release-notes';
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
const WEB_COPY: Record<StartFailureKind, BootFailureCopy> = {
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

export const DOWNLOAD_URL = 'https://stagistic.com/download';

/*
 * The Mac app is one window group on one Mac: there are no tabs to close or
 * reload, and a newer Release arrives by downloading it.
 */
const MAC_COPY: Record<StartFailureKind, BootFailureCopy> = {
    ...WEB_COPY,
    'older-version-running': {
        title: 'An older version of Stagistic is running',
        body: 'Another window is running an older version of Stagistic and still holds your scripts. '
            + 'Quit Stagistic completely and open it again.',
        canReload: false,
    },
    'database-newer-than-app': {
        title: 'Your scripts need a newer Release of Stagistic',
        body: `Your scripts were last opened by a newer Release than this one. Download the current Release at ${DOWNLOAD_URL}. `
            + 'Nothing has been changed.',
        canReload: false,
    },
    'migration-failed': {
        title: 'Stagistic could not update your scripts',
        body: 'Updating your scripts failed. They are still stored on this Mac, and a copy from before the update '
            + 'may be in the backups folder. Restarting Stagistic may help; if it keeps failing, '
            + 'the details below show where it stopped.',
        canReload: false,
    },
    unknown: {
        title: 'Stagistic could not start',
        body: 'Something went wrong while starting the local database. Restart Stagistic to try again.',
        canReload: false,
    },
};

interface BootFailureScreenProps {
    failure: StartFailureInfo,
    /** Which app this is; picks the advice. Passed by each app, never sniffed. */
    surface: ReleaseNoteSurface,
    /** Extra actions below the built-in ones, e.g. downloading a backup after a failed migration. */
    actions?: ReactNode,
    onReload?: () => void,
    /** Mac app: opens the download page outside the app. Without it the page is a plain link. */
    onOpenDownloadPage?: () => void,
    /** Mac app: reveals the backups folder in Finder after a failed migration. */
    onShowBackupsFolder?: () => void,
}

export const BootFailureScreen = ({
    failure,
    surface,
    actions,
    onReload = reloadPage,
    onOpenDownloadPage,
    onShowBackupsFolder,
}: BootFailureScreenProps) => {
    const copy = (surface === 'desktop' ? MAC_COPY : WEB_COPY)[failure.kind];
    const detail = failure.message.trim();
    const isMac = surface === 'desktop';
    const showDownload = isMac && failure.kind === 'database-newer-than-app';
    const showBackups = isMac && failure.kind === 'migration-failed' && onShowBackupsFolder;
    const hasActions = copy.canReload || actions || showDownload || showBackups;

    return (
        <div className={styles.screen} role="alert">
            <div className={styles.card}>
                <p className={styles.wordmark}>Stagistic Editor</p>
                <h1 className={styles.title}>{copy.title}</h1>
                <p className={styles.body}>{copy.body}</p>
                {hasActions && (
                    <div className={styles.actions}>
                        {copy.canReload && <Button onPress={onReload}>Reload</Button>}
                        {showDownload && (onOpenDownloadPage
                            ? <Button onPress={onOpenDownloadPage}>Open download page</Button>
                            : <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">Download Stagistic</a>)}
                        {showBackups && <Button onPress={onShowBackupsFolder}>Show Backups Folder</Button>}
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
