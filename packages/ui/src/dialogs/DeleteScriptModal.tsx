import {Button} from '../atoms/Button';
import {DELETE_SCRIPT_CONFIRM_PHRASE} from './deleteScriptConfirmPhrase';
import {ModalDialog} from './ModalDialog';
import {ModalHeader} from './ModalHeader';
import {TypeToConfirmAction} from './TypeToConfirmAction';

import styles from './DeleteScriptModal.module.css';

export interface DeleteScriptModalProps {
    isOpen: boolean;
    scriptTitle?: string;
    isDeleting?: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}

export const DeleteScriptModal = ({isOpen, scriptTitle, isDeleting = false, onClose, onConfirm}: DeleteScriptModalProps) => (
    <ModalDialog isOpen={isOpen} onClose={onClose} ariaLabel="Delete script">
        <ModalHeader
            title="Delete script"
            description={
                <>
                    Permanently deletes
                    {scriptTitle ? <strong>{` “${scriptTitle}” `}</strong> : ' this script '}
                    and all of its content. This action cannot be undone.
                </>
            }
        />
        <div className={styles.body}>
            <TypeToConfirmAction
                key={isOpen ? 'open' : 'closed'}
                phrase={DELETE_SCRIPT_CONFIRM_PHRASE}
                confirmLabel="Delete script"
                inputAriaLabel={scriptTitle ? `Type ${DELETE_SCRIPT_CONFIRM_PHRASE} to delete ${scriptTitle}` : undefined}
                isPending={isDeleting}
                secondaryAction={
                    <Button variant="ghost" isDisabled={isDeleting} onPress={onClose}>
                        Cancel
                    </Button>
                }
                onConfirm={onConfirm}
            />
        </div>
    </ModalDialog>
);
