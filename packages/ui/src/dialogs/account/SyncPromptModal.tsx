import {Button} from '../../atoms/Button/Button';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import {ModalHeader} from '../modal/ModalHeader';

interface SyncPromptModalProps {
    isOpen: boolean,
    onSignIn: () => void,
    onDismiss: () => void,
}

/** One-time offer for writers who already have scripts and are not signed in. */
export const SyncPromptModal = ({
    isOpen,
    onSignIn,
    onDismiss,
}: SyncPromptModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onDismiss}
        ariaLabel="Sync your scripts"
    >
        <ModalHeader
            title="Sync your scripts with an account?"
            description="Your scripts stay on this device either way. With an account they also sync to your other devices."
        />
        <ModalActions>
            <Button onPress={onSignIn}>Sign in</Button>
            <Button
                variant="ghost"
                onPress={onDismiss}
            >
                Not now
            </Button>
        </ModalActions>
    </ModalDialog>
);
