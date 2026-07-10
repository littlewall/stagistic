import {Button} from '../atoms/Button';
import {ModalDialog} from './ModalDialog';
import styles from './RemoveCharacterModal.module.css';

export interface RemoveCharacterModalProps {
    isOpen: boolean,
    characterKey?: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveCharacterModal = ({
    isOpen,
    characterKey,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveCharacterModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Remove character"
    >
        <h2 className={styles.title}>
            Remove
            {characterKey ? ` ${characterKey}` : ' character'}?
        </h2>
        <p className={styles.subtitle}>
            This only deletes the character record:
            {characterKey ? <strong>{` ${characterKey} `}</strong> : ' the character '}
            stops being confirmed and its color, outline, and other metadata are cleared.
        </p>
        <p className={styles.subtitleSecondary}>
            Its lines and blocks stay in the script — nothing is removed from the screenplay.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isRemoving}
                onPress={() => {
                    void onConfirm();
                }}
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
