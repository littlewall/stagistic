import {
    Button,
    ModalDialog,
} from '@stagistic/ui';

import styles from './DeleteCueModal.module.css';

interface UnassignCueModalProps {
    isOpen: boolean,
    cueTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const UnassignCueModal = ({
    isOpen,
    cueTitle,
    onClose,
    onConfirm,
}: UnassignCueModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Unassign cue"
        panelClassName={styles.panel}
    >
        <h2 className={styles.title}>
            Unassign
            {cueTitle ? ` ${cueTitle}` : ' cue'}?
        </h2>
        <p className={styles.subtitle}>
            This removes
            {cueTitle ? <strong>{` ${cueTitle} `}</strong> : ' the cue '}
            from the script, including its out marker if one exists. The cue stays
            in the Cues list for reuse.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                onPress={() => {
                    void onConfirm();
                }}
            >
                Unassign cue
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
