import {Button} from '../atoms/Button';
import {DeleteScriptConfirm} from './DeleteScriptConfirm';
import styles from './DeleteScriptModal.module.css';
import {ModalDialog} from './ModalDialog';

export interface DeleteScriptModalProps {
    isOpen: boolean,
    scriptTitle?: string,
    isDeleting?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const DeleteScriptModal = ({
    isOpen,
    scriptTitle,
    isDeleting = false,
    onClose,
    onConfirm,
}: DeleteScriptModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Delete script"
    >
        <h2 className={styles.title}>Delete script</h2>
        <p className={styles.subtitle}>
            Permanently deletes
            {scriptTitle ? <strong>{` “${scriptTitle}” `}</strong> : ' this script '}
            and all of its content. This action cannot be undone.
        </p>
        <div className={styles.body}>
            <DeleteScriptConfirm
                key={isOpen ? 'open' : 'closed'}
                scriptTitle={scriptTitle}
                isDeleting={isDeleting}
                secondaryAction={(
                    <Button
                        variant="ghost"
                        isDisabled={isDeleting}
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                )}
                onConfirm={onConfirm}
            />
        </div>
    </ModalDialog>
);
