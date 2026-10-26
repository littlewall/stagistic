import {ConfirmModal} from '../modal/ConfirmModal';
import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';

export interface RemoveAttachmentModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    attachmentName: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveAttachmentModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    attachmentName,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveAttachmentModalProps) => (
    <ConfirmModal
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
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
