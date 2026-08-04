import {Button} from '../atoms/Button';
import {ModalDialog} from './ModalDialog';
import styles from './RemoveCharacterModal.module.css';

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
}: RemoveCharacterModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Remove character"
    >
        <h2 className={styles.title}>
            Remove
            {characterKey ? ` ${characterKey}` : ' character'}?
        </h2>
        <p className={styles.subtitle}>
            This only deletes the character record:
            {characterKey ? <strong>{` ${characterKey} `}</strong> : ' the character '}
            stops being confirmed and its color, outline, and other metadata are cleared.
        </p>
        <p className={styles.subtitleSecondary}>
            Its lines and blocks stay in the script — nothing is removed from the screenplay.
        </p>
        {characterKey && groupNames.length > 0 ? (
            <p className={styles.subtitleSecondary}>
                {characterKey} belongs to {formatGroupNames(groupNames)}. Deleting {characterKey} removes them from these groups.
            </p>
        ) : null}
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isRemoving}
                onPress={() => {
                    void onConfirm();
                }}
            >
                Remove
            </Button>
            <Button
                variant="ghost"
                isDisabled={isRemoving}
                onPress={onClose}
            >
                Cancel
            </Button>
        </div>
    </ModalDialog>
);

const formatGroupNames = (groupNames: string[]) => {
    if (groupNames.length < 2) {
        return groupNames[0] ?? '';
    }

    if (groupNames.length === 2) {
        return `${groupNames[0]} and ${groupNames[1]}`;
    }

    return `${groupNames.slice(0, -1).join(', ')}, and ${groupNames.at(-1)}`;
};
