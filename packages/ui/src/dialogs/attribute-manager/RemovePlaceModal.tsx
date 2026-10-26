import {ConfirmModal} from '../modal/ConfirmModal';
import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';

export interface RemovePlaceModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    placeName: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemovePlaceModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    placeName,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemovePlaceModalProps) => (
    <ConfirmModal
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
        isOpen={isOpen}
        ariaLabel="Remove place"
        title={<>Remove {placeName}?</>}
        description="This deletes the place record. Scenes assigned to it stay in the script and become unassigned."
        confirmLabel="Remove"
        isPending={isRemoving}
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
