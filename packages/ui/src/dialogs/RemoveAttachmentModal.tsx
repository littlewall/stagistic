import {ConfirmModal} from './ConfirmModal';

export interface RemoveAttachmentModalProps {
    isOpen: boolean,
    attachmentName: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveAttachmentModal = ({
    isOpen,
    attachmentName,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveAttachmentModalProps) => (
    <ConfirmModal
        isOpen={isOpen}
        ariaLabel="Remove attachment"
        title={<>Remove {attachmentName}?</>}
        description="This deletes the file from this browser. It cannot be undone."
        confirmLabel="Remove"
        isPending={isRemoving}
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
