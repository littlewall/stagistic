import type {ChangeSummaryItem} from '../../molecules/ChangeSummary/ChangeSummary';
import {ConfirmModal} from '../modal/ConfirmModal';
import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';

export interface RemoveGroupModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    groupName: string,
    usageCount: number,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveGroupModal = ({
    returnFocus,
    fallbackFocus,
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
            returnFocus={returnFocus}
            fallbackFocus={fallbackFocus}
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
