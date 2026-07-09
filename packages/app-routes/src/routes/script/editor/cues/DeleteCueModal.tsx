import {
    Button,
    ModalDialog,
} from '@stagistic/ui';

import styles from './DeleteCueModal.module.css';

interface DeleteCueModalProps {
    isOpen: boolean,
    cueTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const DeleteCueModal = ({
    isOpen,
    cueTitle,
    onClose,
    onConfirm,
}: DeleteCueModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Delete cue"
        panelClassName={styles.panel}
    >
        <h2 className={styles.title}>
            Delete
            {cueTitle ? ` ${cueTitle}` : ' cue'}?
        </h2>
        <p className={styles.subtitle}>
            This removes
            {cueTitle ? <strong>{` ${cueTitle} `}</strong> : ' the cue '}
            from the cue list.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                onPress={() => {
                    void onConfirm();
                }}
            >
                Delete
            </Button>
            <Button
                variant="ghost"
                onPress={onClose}
            >
                Cancel
            </Button>
        </div>
    </ModalDialog>
);
