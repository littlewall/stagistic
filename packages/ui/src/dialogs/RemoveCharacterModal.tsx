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
            This takes
            {characterKey ? <strong>{` ${characterKey} `}</strong> : ' the character '}
            out of your confirmed cast and clears its outline. You can confirm it again later.
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
