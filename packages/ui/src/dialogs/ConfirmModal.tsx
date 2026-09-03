import type {ReactNode} from 'react';

import {Button} from '../atoms/Button';
import {ModalActions} from './ModalActions';
import {ModalDialog} from './ModalDialog';
import {ModalHeader} from './ModalHeader';

export interface ConfirmModalProps {
    isOpen: boolean,
    ariaLabel: string,
    title: ReactNode,
    description?: ReactNode,
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
    isOpen,
    ariaLabel,
    title,
    description,
    notes,
    confirmLabel,
    cancelLabel = 'Cancel',
    isPending = false,
    lockWhilePending = false,
    onClose,
    onConfirm,
}: ConfirmModalProps) => (
    <ModalDialog
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
                isDisabled={isPending}
                onPress={onClose}
            >
                {cancelLabel}
            </Button>
        </ModalActions>
    </ModalDialog>
);
