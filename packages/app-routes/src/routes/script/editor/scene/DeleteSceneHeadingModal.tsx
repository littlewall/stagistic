import type {ModalFocusRestoreOptions} from '@stagistic/ui';
import {ConfirmModal} from '@stagistic/ui';

interface DeleteSceneHeadingModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    isDeleting?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const DeleteSceneHeadingModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    isDeleting = false,
    onClose,
    onConfirm,
}: DeleteSceneHeadingModalProps) => (
    <ConfirmModal
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
        isOpen={isOpen}
        ariaLabel="Delete scene heading"
        title="Delete scene heading?"
        changes={[
            {
                tone: 'out',
                label: 'Removed',
                text: 'Its outline, places and character notes from the Board',
            },
            {
                tone: 'kept',
                label: 'Kept',
                text: 'Blocks in this scene, moved under the previous scene',
            },
        ]}
        notes={['Undo restores these until you create a draft or version.']}
        confirmLabel="Delete heading"
        isPending={isDeleting}
        lockWhilePending
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
