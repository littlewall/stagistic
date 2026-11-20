import {Button} from '@stagistic/ui';

import {reloadPage} from '../shared/reloadPage';
import styles from './BootFailureScreen.module.css';

interface WaitingForDatabaseScreenProps {
    /** The step the start is on, so a long migration stays visible. */
    status?: string,
    /** 0 to 1. */
    progress?: number,
    /** Set after a long silence: the writer may reload, nothing forces it. */
    canReload?: boolean,
    onReload?: () => void,
}

/*
 * Shown while the database legitimately waits (another tab's leader, or a long
 * migration). Not a failure: it goes away by itself when the leader answers.
 * Only after a long silence does it offer a reload. The copy must never suggest
 * Stagistic works in one tab only.
 */
export const WaitingForDatabaseScreen = ({
    status,
    progress,
    canReload = false,
    onReload = reloadPage,
}: WaitingForDatabaseScreenProps) => (
    <div
        className={styles.screen}
        role="status"
        aria-live="polite"
    >
        <div className={styles.card}>
            <p className={styles.wordmark}>Stagistic Editor</p>
            <h1 className={styles.title}>Stagistic is still starting</h1>
            <p className={styles.body}>
                Opening your scripts is taking longer than usual. Stagistic is still
                working and will continue on its own. You can leave this tab open.
            </p>
            {status && <p className={styles.status}>{status}</p>}
            {progress !== undefined && (
                <progress
                    className={styles.progress}
                    value={progress}
                    max={1}
                    aria-label={status ?? 'Starting'}
                />
            )}
            {canReload && (
                <>
                    <p className={styles.body}>
                        Nothing has changed for a long while. If it stays like this, you can reload.
                        Your scripts stay on this device.
                    </p>
                    <div className={styles.actions}>
                        <Button onPress={onReload}>Reload</Button>
                    </div>
                </>
            )}
        </div>
    </div>
);
