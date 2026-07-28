import {Button} from '../atoms/Button';
import {ModalDialog} from './ModalDialog';
import styles from './RemoveAttachmentModal.module.css';

export interface RemoveAttachmentModalProps {
    isOpen: boolean,
    attachmentName: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveAttachmentModal = ({
    isOpen,
    attachmentName,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveAttachmentModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Remove attachment"
    >
        <h2 className={styles.title}>Remove {attachmentName}?</h2>
        <p className={styles.subtitle}>
            This deletes the file from this browser. It cannot be undone.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isRemoving}
                onPress={() => void onConfirm()}
            >
                Remove
            </Button>
            <Button
                variant="ghost"
                isDisabled={isRemoving}
                onPress={onClose}
            >
                Cancel
            </Button>
        </div>
    </ModalDialog>
);
