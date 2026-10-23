import {ConfirmModal} from '@stagistic/ui';

interface ConvertSceneHeadingModalProps {
    isOpen: boolean,
    isConverting?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const ConvertSceneHeadingModal = ({
    isOpen,
    isConverting = false,
    onClose,
    onConfirm,
}: ConvertSceneHeadingModalProps) => (
    <ConfirmModal
        isOpen={isOpen}
        ariaLabel="Convert scene heading"
        title="Convert scene heading?"
        changes={[
            {
                tone: 'out',
                label: 'Removed',
                text: 'Its synopsis and places',
            },
            {
                tone: 'kept',
                label: 'Kept',
                text: 'The heading text, as the new block type',
            },
        ]}
        confirmLabel="Convert heading"
        isPending={isConverting}
        lockWhilePending
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
