import {ConfirmModal} from '@stagistic/ui';

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
    <ConfirmModal
        isOpen={isOpen}
        ariaLabel="Delete scene heading"
        title="Delete scene heading?"
        description="Its synopsis and places will be removed. Blocks in this scene stay and move under the previous scene."
        confirmLabel="Delete heading"
        isPending={isDeleting}
        lockWhilePending
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
