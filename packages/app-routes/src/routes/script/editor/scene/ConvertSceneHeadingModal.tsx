import {
    Button,
    ModalDialog,
} from '@stagistic/ui';

import styles from './ConvertSceneHeadingModal.module.css';

interface ConvertSceneHeadingModalProps {
    isOpen: boolean,
    isConverting?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const ConvertSceneHeadingModal = ({
    isOpen,
    isConverting = false,
    onClose,
    onConfirm,
}: ConvertSceneHeadingModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={() => {
            if (!isConverting) {
                onClose();
            }
        }}
        ariaLabel="Convert scene heading"
        panelClassName={styles.panel}
    >
        <h2 className={styles.title}>
            Convert scene heading?
        </h2>
        <p className={styles.subtitle}>
            Its synopsis and places will be removed. The heading text stays as the new block type.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isConverting}
                onPress={() => {
                    void onConfirm();
                }}
            >
                Convert heading
            </Button>
            <Button
                variant="ghost"
                isDisabled={isConverting}
                onPress={onClose}
            >
                Cancel
            </Button>
        </div>
    </ModalDialog>
);
