import type {ModalFocusRestoreOptions} from '@stagistic/ui';
import {ConfirmModal} from '@stagistic/ui';

interface BoardDeleteActModalProps extends ModalFocusRestoreOptions {
    actName: string,
    /** Null when the deleted act is the first: its scenes become unassigned. */
    previousActName: string | null,
    onClose: () => void,
    onConfirm: () => void,
}

/** Asks before an act disappears: only the heading goes, the scenes stay. */
export const BoardDeleteActModal = ({
    returnFocus,
    fallbackFocus,
    actName,
    previousActName,
    onClose,
    onConfirm,
}: BoardDeleteActModalProps) => (
    <ConfirmModal
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
        isOpen
        ariaLabel="Delete act"
        title={`Delete act “${actName}”?`}
        description={previousActName === null
            ? 'Its scenes will become unassigned. No scenes will be deleted.'
            : `Its scenes will move to “${previousActName}”. No scenes will be deleted.`}
        confirmLabel="Delete act"
        onClose={onClose}
        onConfirm={onConfirm}
    />
);
