import type {ChangeSummaryItem} from '../../molecules/ChangeSummary/ChangeSummary';
import {ConfirmModal} from '../modal/ConfirmModal';

export interface RemoveCharacterModalProps {
    isOpen: boolean,
    characterKey?: string,
    groupNames?: string[],
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveCharacterModal = ({
    isOpen,
    characterKey,
    groupNames = [],
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveCharacterModalProps) => {
    const changes: ChangeSummaryItem[] = [
        {
            tone: 'out',
            label: 'Cleared',
            text: 'Its color, outline and other metadata; it stops being confirmed',
        },
        ...characterKey && groupNames.length > 0
            ? [
                {
                    tone: 'out' as const,
                    label: 'Removed from',
                    text: formatGroupNames(groupNames),
                },
            ]
            : [],
        {
            tone: 'kept',
            label: 'Kept',
            text: 'Its lines and blocks in the script',
        },
    ];

    return (
        <ConfirmModal
            isOpen={isOpen}
            ariaLabel="Remove character"
            title={(
                <>
                    Remove
                    {characterKey ? ` ${characterKey}` : ' character'}?
                </>
            )}
            description="This only deletes the character record."
            changes={changes}
            confirmLabel="Remove"
            isPending={isRemoving}
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
};

const formatGroupNames = (groupNames: string[]) => {
    if (groupNames.length < 2) {
        return groupNames[0] ?? '';
    }

    if (groupNames.length === 2) {
        return `${groupNames[0]} and ${groupNames[1]}`;
    }

    return `${groupNames.slice(0, -1).join(', ')}, and ${groupNames.at(-1)}`;
};
