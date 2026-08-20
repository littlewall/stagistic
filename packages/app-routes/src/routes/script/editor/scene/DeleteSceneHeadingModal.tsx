import {
    Button,
    ModalDialog,
} from '@stagistic/ui';

import styles from './DeleteSceneHeadingModal.module.css';

interface DeleteSceneHeadingModalProps {
    isOpen: boolean,
    isDeleting?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const DeleteSceneHeadingModal = ({
    isOpen,
    isDeleting = false,
    onClose,
    onConfirm,
}: DeleteSceneHeadingModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={() => {
            if (!isDeleting) {
                onClose();
            }
        }}
        ariaLabel="Delete scene heading"
        panelClassName={styles.panel}
    >
        <h2 className={styles.title}>
            Delete scene heading?
        </h2>
        <p className={styles.subtitle}>
            Its synopsis and places will be removed. Blocks in this scene stay and move under the previous scene.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isDeleting}
                onPress={() => {
                    void onConfirm();
                }}
            >
                Delete heading
            </Button>
            <Button
                variant="ghost"
                isDisabled={isDeleting}
                onPress={onClose}
            >
                Cancel
            </Button>
        </div>
    </ModalDialog>
);
