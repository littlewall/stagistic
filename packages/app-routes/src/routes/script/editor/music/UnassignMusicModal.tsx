import {ConfirmModal} from '@stagistic/ui';

interface UnassignMusicModalProps {
    isOpen: boolean,
    musicTitle?: string,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const UnassignMusicModal = ({
    isOpen,
    musicTitle,
    onClose,
    onConfirm,
}: UnassignMusicModalProps) => (
    <ConfirmModal
        isOpen={isOpen}
        ariaLabel="Unassign music"
        title={(
            <>
                Unassign
                {musicTitle ? ` ${musicTitle}` : ' music'}?
            </>
        )}
        description={(
            <>
                This removes
                {musicTitle ? <strong>{` ${musicTitle} `}</strong> : ' the music '}
                from the script, including its out marker if one exists. The music stays
                in the Music list for reuse.
            </>
        )}
        confirmLabel="Unassign music"
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
