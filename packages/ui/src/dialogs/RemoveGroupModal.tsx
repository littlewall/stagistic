import {Button} from '../atoms/Button';
import styles from './RemoveCharacterModal.module.css';
import {ModalDialog} from './ModalDialog';

export interface RemoveGroupModalProps {
    isOpen: boolean,
    groupName: string,
    usageCount: number,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveGroupModal = ({
    isOpen,
    groupName,
    usageCount,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveGroupModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Remove group"
    >
        <h2 className={styles.title}>Remove {groupName}?</h2>
        <p className={styles.subtitle}>This deletes the group record and its membership.</p>
        {usageCount > 0 ? (
            <p className={styles.subtitleSecondary}>
                Its occurrences stay in the script and become unconfirmed characters.
            </p>
        ) : null}
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isRemoving}
                onPress={() => void onConfirm()}
            >
                Remove
            </Button>
            <Button variant="ghost" isDisabled={isRemoving} onPress={onClose}>Cancel</Button>
        </div>
    </ModalDialog>
);
