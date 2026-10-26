import type {ModalFocusRestoreOptions} from '@stagistic/ui';
import {ConfirmModal} from '@stagistic/ui';

interface DeleteMusicModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    isDeleting?: boolean,
    musicTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const DeleteMusicModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    isDeleting = false,
    musicTitle,
    onClose,
    onConfirm,
}: DeleteMusicModalProps) => (
    <ConfirmModal
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
        isOpen={isOpen}
        ariaLabel="Delete music"
        title={(
            <>
                Delete
                {musicTitle ? ` ${musicTitle}` : ' music'}?
            </>
        )}
        description={(
            <>
                This removes
                {musicTitle ? <strong>{` ${musicTitle} `}</strong> : ' the music '}
                from the music list.
            </>
        )}
        confirmLabel="Delete"
        isPending={isDeleting}
        lockWhilePending
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
