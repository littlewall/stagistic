import type {ReactNode} from 'react';

import {Button} from '../../atoms/Button/Button';
import {ModalActions} from './ModalActions';
import {ModalDialog} from './ModalDialog';
import type {ModalFocusRestoreOptions} from './modalFocusTypes';
import {ModalHeader, type ModalHeaderProps} from './ModalHeader';

export interface ConfirmModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    ariaLabel: string,
    title: ReactNode,
    description?: ReactNode,
    changes?: ModalHeaderProps['changes'],
    notes?: ReactNode[],
    confirmLabel: string,
    cancelLabel?: string,
    isPending?: boolean,
    /* Blocks the backdrop and Esc while the confirm action is in flight. */
    lockWhilePending?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const ConfirmModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    ariaLabel,
    title,
    description,
    changes,
    notes,
    confirmLabel,
    cancelLabel = 'Cancel',
    isPending = false,
    lockWhilePending = false,
    onClose,
    onConfirm,
}: ConfirmModalProps) => (
    <ModalDialog
        returnFocus={returnFocus}
        fallbackFocus={fallbackFocus}
        isOpen={isOpen}
        onClose={() => {
            if (!(lockWhilePending && isPending)) {
                onClose();
            }
        }}
        ariaLabel={ariaLabel}
    >
        <ModalHeader
            title={title}
            description={description}
            changes={changes}
            notes={notes}
        />
        <ModalActions spacing="lg">
            <Button
                variant="danger"
                isPending={isPending}
                onPress={() => {
                    void onConfirm();
                }}
            >
                {confirmLabel}
            </Button>
            <Button
                variant="ghost"
                data-modal-initial-focus
                isDisabled={isPending}
                onPress={onClose}
            >
                {cancelLabel}
            </Button>
        </ModalActions>
    </ModalDialog>
);
