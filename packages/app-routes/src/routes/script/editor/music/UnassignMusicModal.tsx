import {
    Button,
    ModalDialog,
} from '@stagistic/ui';

import styles from './DeleteMusicModal.module.css';

interface UnassignMusicModalProps {
    isOpen: boolean,
    musicTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const UnassignMusicModal = ({
    isOpen,
    musicTitle,
    onClose,
    onConfirm,
}: UnassignMusicModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Unassign music"
        panelClassName={styles.panel}
    >
        <h2 className={styles.title}>
            Unassign
            {musicTitle ? ` ${musicTitle}` : ' music'}?
        </h2>
        <p className={styles.subtitle}>
            This removes
            {musicTitle ? <strong>{` ${musicTitle} `}</strong> : ' the music '}
            from the script, including its out marker if one exists. The music stays
            in the Music list for reuse.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                onPress={() => {
                    void onConfirm();
                }}
            >
                Unassign music
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
