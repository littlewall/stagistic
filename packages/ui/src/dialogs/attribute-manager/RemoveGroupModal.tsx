import type {ChangeSummaryItem} from '../../molecules/ChangeSummary/ChangeSummary';
import {ConfirmModal} from '../modal/ConfirmModal';

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
    const changes: ChangeSummaryItem[] = [
        {
            tone: 'out',
            label: 'Deleted',
            text: 'The group record and its membership',
        },
        ...usageCount > 0 ? [
            {
                tone: 'kept' as const,
                label: 'Kept',
                text: 'Its occurrences in the script, as unconfirmed characters',
            },
        ] : [],
    ];

    return (
        <ConfirmModal
            isOpen={isOpen}
            ariaLabel="Remove group"
            title={<>Remove {groupName}?</>}
            changes={changes}
            confirmLabel="Remove"
            isPending={isRemoving}
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
};
