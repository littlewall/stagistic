import type {ReactNode} from 'react';

import {ConfirmModal} from './ConfirmModal';

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
    const notes: ReactNode[] = ['Its lines and blocks stay in the script — nothing is removed from the screenplay.'];

    if (characterKey && groupNames.length > 0) {
        notes.push(
            <>
                {characterKey} belongs to {formatGroupNames(groupNames)}. Deleting {characterKey} removes them from these groups.
            </>,
        );
    }

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
            description={(
                <>
                    This only deletes the character record:
                    {characterKey ? <strong>{` ${characterKey} `}</strong> : ' the character '}
                    stops being confirmed and its color, outline, and other metadata are cleared.
                </>
            )}
            notes={notes}
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
