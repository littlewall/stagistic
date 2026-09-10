import {ConfirmModal} from '@stagistic/ui';

interface DeleteMusicModalProps {
    isOpen: boolean,
    isDeleting?: boolean,
    musicTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const DeleteMusicModal = ({
    isOpen,
    isDeleting = false,
    musicTitle,
    onClose,
    onConfirm,
}: DeleteMusicModalProps) => (
    <ConfirmModal
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
