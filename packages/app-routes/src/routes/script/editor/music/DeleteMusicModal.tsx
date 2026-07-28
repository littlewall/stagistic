import {
    Button,
    ModalDialog,
} from '@stagistic/ui';

import styles from './DeleteMusicModal.module.css';

interface DeleteMusicModalProps {
    isOpen: boolean,
    isDeleting?: boolean,
    musicTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const DeleteMusicModal = ({
    isOpen,
    isDeleting = false,
    musicTitle,
    onClose,
    onConfirm,
}: DeleteMusicModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={() => {
            if (!isDeleting) {
                onClose();
            }
        }}
        ariaLabel="Delete music"
        panelClassName={styles.panel}
    >
        <h2 className={styles.title}>
            Delete
            {musicTitle ? ` ${musicTitle}` : ' music'}?
        </h2>
        <p className={styles.subtitle}>
            This removes
            {musicTitle ? <strong>{` ${musicTitle} `}</strong> : ' the music '}
            from the music list.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isDeleting}
                onPress={() => {
                    void onConfirm();
                }}
            >
                Delete
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
