import type {ModalFocusRestoreOptions} from '@stagistic/ui';
import {ConfirmModal} from '@stagistic/ui';

interface UnassignMusicModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    musicTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const UnassignMusicModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    musicTitle,
    onClose,
    onConfirm,
}: UnassignMusicModalProps) => (
    <ConfirmModal
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
        isOpen={isOpen}
        ariaLabel="Unassign music"
        title={(
            <>
                Unassign
                {musicTitle ? ` ${musicTitle}` : ' music'}?
            </>
        )}
        changes={[
            {
                tone: 'out',
                label: 'Removed',
                text: 'Its place in the script, including the out marker if there is one',
            },
            {
                tone: 'kept',
                label: 'Kept',
                text: 'The music in the Music list, for reuse',
            },
        ]}
        confirmLabel="Unassign music"
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
