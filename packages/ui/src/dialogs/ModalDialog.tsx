import {clsx} from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useRef,
} from 'react';

import styles from './ModalDialog.module.css';

interface ModalDialogProps {
    isOpen: boolean,
    onClose: () => void,
    ariaLabel: string,
    children: ReactNode,
    panelClassName?: string,
}

export const ModalDialog = ({
    isOpen,
    onClose,
    ariaLabel,
    children,
    panelClassName,
}: ModalDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (isOpen && !dialog.open) {
            dialog.showModal();
        }

        if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    const handleCancel = useCallback((event: SyntheticEvent) => {
        event.preventDefault();
        onClose();
    }, [onClose]);

    const handleClick = useCallback((event: ReactMouseEvent<HTMLDialogElement>) => {
        if (event.target === dialogRef.current) {
            onClose();
        }
    }, [onClose]);

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-label={ariaLabel}
            onCancel={handleCancel}
            onClick={handleClick}
        >
            <div className={clsx(panelClassName, styles.panel)}>
                {children}
            </div>
        </dialog>
    );
};
