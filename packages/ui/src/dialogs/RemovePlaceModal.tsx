import {Button} from '../atoms/Button';
import {ModalDialog} from './ModalDialog';
import styles from './RemovePlaceModal.module.css';

export interface RemovePlaceModalProps {
    isOpen: boolean,
    placeName: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemovePlaceModal = ({
    isOpen,
    placeName,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemovePlaceModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Remove place"
    >
        <h2 className={styles.title}>Remove {placeName}?</h2>
        <p className={styles.subtitle}>
            This deletes the place record. Scenes assigned to it stay in the script and become unassigned.
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
