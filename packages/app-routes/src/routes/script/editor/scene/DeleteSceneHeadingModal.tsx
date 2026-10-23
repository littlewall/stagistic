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
        changes={[
            {
                tone: 'out',
                label: 'Removed',
                text: 'Its synopsis and places',
            },
            {
                tone: 'kept',
                label: 'Kept',
                text: 'Blocks in this scene, moved under the previous scene',
            },
        ]}
        confirmLabel="Delete heading"
        isPending={isDeleting}
        lockWhilePending
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
