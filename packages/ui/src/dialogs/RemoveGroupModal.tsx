import type {ReactNode} from 'react';

import {ConfirmModal} from './ConfirmModal';

export interface RemoveGroupModalProps {
    isOpen: boolean,
    groupName: string,
    usageCount: number,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveGroupModal = ({
    isOpen,
    groupName,
    usageCount,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveGroupModalProps) => {
    const notes: ReactNode[] = usageCount > 0
        ? ['Its occurrences stay in the script and become unconfirmed characters.']
        : [];

    return (
        <ConfirmModal
            isOpen={isOpen}
            ariaLabel="Remove group"
            title={<>Remove {groupName}?</>}
            description="This deletes the group record and its membership."
            notes={notes}
            confirmLabel="Remove"
            isPending={isRemoving}
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
};
