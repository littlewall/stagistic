import {ConfirmModal} from './ConfirmModal';

export interface RemovePlaceModalProps {
    isOpen: boolean,
    placeName: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemovePlaceModal = ({
    isOpen,
    placeName,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemovePlaceModalProps) => (
    <ConfirmModal
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
