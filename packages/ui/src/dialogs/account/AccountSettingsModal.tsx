import {Button} from '../../atoms/Button/Button';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import {ModalHeader} from '../modal/ModalHeader';
import styles from './account.module.css';
import {formatSyncTime} from './types';

interface AccountSettingsModalProps {
    isOpen: boolean,
    onClose: () => void,
    email: string,
    /** Human label of the sync state ("Synced", "Offline" …). */
    syncLabel: string,
    lastSyncedAt: number | null,
    pending: number,
    onSignOut: () => void,
}

export const AccountSettingsModal = ({
    isOpen,
    onClose,
    email,
    syncLabel,
    lastSyncedAt,
    pending,
    onSignOut,
}: AccountSettingsModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Account settings"
    >
        <ModalHeader title="Account" />
        <dl className={styles.rows}>
            <div className={styles.row}>
                <dt className={styles.rowLabel}>Email</dt>
                <dd>{email}</dd>
            </div>
            <div className={styles.row}>
                <dt className={styles.rowLabel}>Sync</dt>
                <dd>{syncLabel}</dd>
            </div>
            <div className={styles.row}>
                <dt className={styles.rowLabel}>Last synced</dt>
                <dd>{lastSyncedAt ? formatSyncTime(lastSyncedAt) : 'Not yet'}</dd>
            </div>
            <div className={styles.row}>
                <dt className={styles.rowLabel}>Waiting to sync</dt>
                <dd>{pending > 0 ? `${pending} script${pending === 1 ? '' : 's'}` : 'Nothing'}</dd>
            </div>
        </dl>
        <p className={styles.summary}>Signing out keeps your scripts on this device; syncing pauses until you sign in again.</p>
        <ModalActions>
            <Button onPress={onClose}>Done</Button>
            <Button
                variant="ghost"
                onPress={onSignOut}
            >
                Sign out
            </Button>
        </ModalActions>
    </ModalDialog>
);
