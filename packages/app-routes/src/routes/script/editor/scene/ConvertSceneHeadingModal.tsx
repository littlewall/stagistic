import type {ModalFocusRestoreOptions} from '@stagistic/ui';
import {ConfirmModal} from '@stagistic/ui';

interface ConvertSceneHeadingModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    isConverting?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const ConvertSceneHeadingModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    isConverting = false,
    onClose,
    onConfirm,
}: ConvertSceneHeadingModalProps) => (
    <ConfirmModal
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
        isOpen={isOpen}
        ariaLabel="Convert scene heading"
        title="Convert scene heading?"
        changes={[
            {
                tone: 'out',
                label: 'Removed',
                text: 'Its outline, places and character notes from the Board',
            },
            {
                tone: 'kept',
                label: 'Kept',
                text: 'The heading text, as the new block type',
            },
        ]}
        notes={['Undo restores these until you create a draft or version.']}
        confirmLabel="Convert heading"
        isPending={isConverting}
        lockWhilePending
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
